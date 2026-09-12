import { parseInvokeWebRequest } from "./invoke-webrequest";
import { parseCurlTokens } from "./parse";

/** Parse literal DevTools cURL arguments; never evaluate PowerShell code. */
export function tokenizePowerShell(input: string): string[] {
  const line = input.trim().replace(/^PS [^\n>]*>\s*/, "");
  const tokens: string[] = [];
  let value = "";
  let quote = "";
  let started = false;
  const flush = () => {
    if (started) tokens.push(value);
    value = "";
    started = false;
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (quote === "'") {
      if (ch === "'" && next === "'") { value += "'"; i++; }
      else if (ch === "'") quote = "";
      else value += ch;
      continue;
    }
    if (ch === "`") {
      if (next === undefined) throw new Error("The command ends with an incomplete backtick escape.");
      i++;
      if (next === "\r" && line[i + 1] === "\n") { i++; continue; }
      if (next === "\n") continue;
      const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", "0": "\0", a: "\x07", b: "\b", f: "\f", v: "\v", e: "\x1b" };
      value += escapes[next] ?? next;
      started = true;
      continue;
    }
    if (ch === "$" && /[\w{(?]/.test(next ?? "")) {
      throw new Error("PowerShell variables and expressions cannot be evaluated. Paste literal values or use single quotes for a literal dollar sign.");
    }
    if (quote === '"') {
      if (ch === '"' && next === '"') { value += '"'; i++; }
      else if (ch === '"') quote = "";
      else value += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
    if (/[;|&()<>]/.test(ch) || (ch === "@" && /[{'"]/.test(next ?? ""))) {
      throw new Error("Paste one literal cURL command. PowerShell scripts, pipelines and here-strings are not supported.");
    }
    if (/\s/.test(ch)) { flush(); continue; }
    value += ch;
    started = true;
  }
  if (quote) throw new Error("Unbalanced PowerShell quote. Copy the complete command.");
  flush();
  return tokens;
}

export function parsePowerShell(input: string) {
  const command = input.trim().replace(/^PS [^\n>]*>\s*/, "");
  if (/^(?:\$|Invoke-WebRequest\b|iwr\b|curl\s+-Uri\b)/i.test(command)) {
    return parseInvokeWebRequest(command);
  }
  return parseCurlTokens(tokenizePowerShell(command));
}
