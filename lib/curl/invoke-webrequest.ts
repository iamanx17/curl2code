import { parseCurlTokens } from "./parse";

/** A reader for the literal request format emitted by browser DevTools, not a script evaluator. */
class Reader {
  pos = 0;
  warnings: string[] = [];
  constructor(readonly input: string) {}
  skip() {
    const match = /^(?:\s|`\r?\n)*/.exec(this.input.slice(this.pos))!;
    this.pos += match[0].length;
  }
  take(pattern: RegExp): string | undefined {
    this.skip();
    const match = pattern.exec(this.input.slice(this.pos));
    if (!match) return undefined;
    this.pos += match[0].length;
    return match[0];
  }
  expect(pattern: RegExp) {
    if (!this.take(pattern)) throw new Error("Unsupported PowerShell syntax. Paste the complete request copied from browser DevTools; scripts are not executed.");
  }
  literal(urlField = false): string {
    this.skip();
    const quote = this.input[this.pos];
    if (quote !== '"' && quote !== "'") {
      const word = this.take(/^[\w:/%.?=&+~@,\-]+/);
      if (word) return word;
      throw new Error("Expected a literal PowerShell value. Variables and expressions are not evaluated.");
    }
    this.pos++;
    let value = "";
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos++];
      if (ch === quote) {
        if (this.input[this.pos] === quote) { value += quote; this.pos++; }
        else return value;
      } else if (quote === '"' && ch === "`") {
        const next = this.input[this.pos++];
        if (next === undefined) break;
        const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", "0": "\0", a: "\x07", b: "\b", f: "\f", v: "\v", e: "\x1b" };
        if (next === "\r" && this.input[this.pos] === "\n") this.pos++;
        else if (next !== "\n") value += escapes[next] ?? next;
      } else if (quote === '"' && ch === "$") {
        // Chromium emits Unicode as literal character codes in expandable strings.
        const char = /^\(\[char\](\d+)\)/i.exec(this.input.slice(this.pos));
        if (!char || Number(char[1]) > 65535) throw new Error("PowerShell variables and expressions are not evaluated. Use literal values.");
        value += String.fromCharCode(Number(char[1]));
        this.pos += char[0].length;
      } else if (urlField && ch === "%" && /^22[ \t]*(?:`[ \t]*)?(?:\r?\n|$)/i.test(this.input.slice(this.pos))) {
        // Some pasted browser exports encode the closing quote. Limit recovery to URL fields.
        this.pos += 2;
        this.warnings.push("Restored an encoded closing quote (%22) in a URL field. Verify the generated URL before running it.");
        return value;
      } else {
        if (urlField && /[\r\n]/.test(ch)) throw new Error("A URL field has a missing closing quote. Copy the complete PowerShell request again.");
        value += ch;
      }
    }
    throw new Error("Unbalanced PowerShell quote. Copy the complete command.");
  }
}

export function parseInvokeWebRequest(input: string) {
  const reader = new Reader(input);
  const headers = new Map<string, { name: string; value: string }>();
  const header = (name: string, value: string) => headers.set(name.toLowerCase(), { name, value });
  const cookies: { name: string; value: string; path: string; domain: string }[] = [];
  let session: string | undefined;
  let useSession = false;
  let sessionAgent: string | undefined;
  // Only the known WebRequestSession construction and literal assignments are accepted.
  while (reader.take(/^\$/)) {
    const variable = reader.take(/^[a-z_]\w*/i);
    if (!variable) throw new Error("Invalid PowerShell session variable.");
    if (reader.take(/^=/)) {
      if (session) throw new Error("Only one browser request session is supported.");
      reader.expect(/^New-Object\s+Microsoft\.PowerShell\.Commands\.WebRequestSession\b/i);
      session = variable.toLowerCase();
    } else {
      if (variable.toLowerCase() !== session) throw new Error("Unknown PowerShell session variable.");
      if (reader.take(/^\.UserAgent\s*=/i)) sessionAgent = reader.literal();
      else {
        reader.expect(/^\.Cookies\.Add\s*\(\s*\(\s*New-Object\s+System\.Net\.Cookie\s*\(/i);
        const name = reader.literal(); reader.expect(/^,/);
        const value = reader.literal(); reader.expect(/^,/);
        const path = reader.literal(); reader.expect(/^,/);
        const domain = reader.literal(); reader.expect(/^\)\s*\)\s*\)/);
        cookies.push({ name, value, path, domain });
      }
    }
    reader.take(/^;/);
  }
  reader.expect(/^(?:Invoke-WebRequest|iwr|curl)\b/i);
  let url = "";
  let method: string | undefined;
  let body: string | undefined;
  let insecure = false;
  while (true) {
    reader.skip();
    if (reader.pos === input.length) break;
    if (reader.take(/^;\s*$/)) break;
    const parameter = reader.take(/^-[a-z]+\b/i)?.toLowerCase();
    if (!parameter) throw new Error("Unsupported PowerShell syntax after the request. Paste a single browser request.");
    switch (parameter) {
      case "-usebasicparsing": break;
      case "-uri": url = reader.literal(true); break;
      case "-method": method = reader.literal(); break;
      case "-websession": {
        reader.expect(/^\$/);
        const variable = reader.take(/^[a-z_]\w*/i);
        if (!session || variable?.toLowerCase() !== session) throw new Error("Include the WebRequestSession definition copied with this request.");
        useSession = true;
        break;
      }
      case "-useragent": header("User-Agent", reader.literal()); break;
      case "-contenttype": header("Content-Type", reader.literal()); break;
      case "-headers":
        reader.expect(/^@\{/);
        while (!reader.take(/^\}/)) {
          const name = reader.literal(); reader.expect(/^=/);
          header(name, reader.literal(name.toLowerCase() === "referer"));
          reader.take(/^;/);
        }
        break;
      case "-body": {
        const utf8 = reader.take(/^\(\s*\[System\.Text\.Encoding\]\s*::\s*UTF8\.GetBytes\s*\(/i);
        body = reader.literal();
        if (utf8) reader.expect(/^\)\s*\)/);
        break;
      }
      case "-skipcertificatecheck": insecure = true; break;
      default: throw new Error(`Unsupported Invoke-WebRequest parameter: ${parameter}. Paste the literal request from browser DevTools.`);
    }
  }
  let target: URL;
  try { target = new URL(url); } catch { throw new Error("Include a valid absolute URL in -Uri."); }
  if (useSession) {
    if (sessionAgent && !headers.has("user-agent")) header("User-Agent", sessionAgent);
    const matching = cookies.filter(cookie => {
      const domain = cookie.domain.replace(/^\./, "").toLowerCase();
      const domainMatches = target.hostname === domain || target.hostname.endsWith(`.${domain}`);
      const path = cookie.path || "/";
      return domainMatches && (target.pathname === path || target.pathname.startsWith(path.endsWith("/") ? path : `${path}/`));
    });
    if (matching.length) {
      const combined = matching.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
      header("Cookie", [headers.get("cookie")?.value, combined].filter(Boolean).join("; "));
    }
  }
  const args = ["curl", url, "-L"];
  if (method) args.push("-X", method);
  for (const { name, value } of headers.values()) args.push("-H", `${name}: ${value}`);
  if (body !== undefined) args.push("--data-raw", body);
  if (insecure) args.push("-k");
  const request = parseCurlTokens(args);
  request.warnings.push(...new Set(reader.warnings));
  return request;
}
