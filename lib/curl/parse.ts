export type FormPart = { name: string; value: string; isFile: boolean; type: string | null };

export type Body =
  | { kind: "json"; raw: string; json: unknown }
  | { kind: "form"; raw: string; pairs: [string, string][] }
  | { kind: "raw"; raw: string }
  | { kind: "multipart"; parts: FormPart[] };

export type Request = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Body | null;
  insecure: boolean;
  followRedirects: boolean;
  warnings: string[];
};

/** Commands get pasted from terminals, docs and "Copy as cURL" menus. */
function normalize(input: string) {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/^\s*(?:\$|>|PS [^\n>]*>)\s+/gm, "")
    .replace(/\\\r?\n/g, " ")
    .replace(/`\r?\n/g, " ")
    .replace(/\^\r?\n/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function tokenize(line: string) {
  const tokens: string[] = [];

  let current = "";
  let quote: string | null = null;
  let started = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (quote === "'") {
      if (char === "'") quote = null;
      else current += char;
      continue;
    }

    if (quote === '"') {
      if (char === "\\" && /["\\$`]/.test(line[i + 1] ?? "")) current += line[++i];
      else if (char === '"') quote = null;
      else current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      started = true;
      continue;
    }

    if (char === "\\" && i + 1 < line.length) {
      current += line[++i];
      started = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (current || started) tokens.push(current);
      current = "";
      started = false;
      continue;
    }

    current += char;
    started = true;
  }

  if (current || started) tokens.push(current);

  if (quote) {
    throw new Error(
      `Unbalanced ${quote === "'" ? "single" : "double"} quote — the command looks cut off. Copy the whole thing, including the closing quote.`,
    );
  }

  return tokens;
}

const BOOL_FLAGS = new Set([
  "-s", "--silent", "-S", "--show-error", "-v", "--verbose", "-#", "--progress-bar",
  "-L", "--location", "-i", "--include", "-I", "--head", "-k", "--insecure",
  "-g", "--globoff", "-f", "--fail", "--fail-with-body", "--compressed",
  "-G", "--get", "-N", "--no-buffer", "--http1.1", "--http2", "--http3",
  "-4", "--ipv4", "-6", "--ipv6", "-O", "--remote-name", "-J", "--remote-header-name",
  "--no-progress-meter", "-q", "--disable", "--tlsv1.2", "--tlsv1.3", "--raw",
  "--path-as-is", "--anyauth", "--basic", "--digest", "--ntlm", "--negotiate", "--tcp-nodelay",
]);

/** Flags we do not model, whose value still has to be stepped over. */
const SKIPPED_VALUE_FLAGS = new Set([
  "-o", "--output", "-w", "--write-out", "--connect-timeout", "-m", "--max-time",
  "--retry", "--retry-delay", "--retry-max-time", "--limit-rate", "-x", "--proxy",
  "--proxy-user", "--cacert", "--capath", "--cert", "--key", "--cert-type",
  "--resolve", "--interface", "--dns-servers", "--cookie-jar", "-c",
  "--max-redirs", "--stderr", "--trace", "--trace-ascii", "--config", "-K",
  "--unix-socket", "--tls-max", "--ciphers",
]);

const looksLikeUrl = (token: string) =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(token) || /^[\w.-]+\.[a-z]{2,}(?:[:/?#]|$)/i.test(token);

function splitPair(text: string): [string, string] {
  const at = text.indexOf("=");
  return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 1)];
}

function encodeUrlencoded(value: string) {
  if (value.startsWith("=")) return encodeURIComponent(value.slice(1));

  const at = value.indexOf("=");
  if (at === -1) return encodeURIComponent(value);

  return value.slice(0, at) + "=" + encodeURIComponent(value.slice(at + 1));
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function base64(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

export const headerValue = (headers: Record<string, string>, name: string) => {
  const key = Object.keys(headers).find((header) => header.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
};

export function parseCurl(input: string): Request {
  const line = normalize(input);
  if (!line) throw new Error("Paste a cURL command first.");

  return parseCurlTokens(tokenize(line));
}

/** Shell-specific tokenizers share all HTTP option parsing and generators. */
export function parseCurlTokens(args: string[]): Request {
  const tokens = [...args];

  if (!/^curl(\.exe)?$/i.test(tokens[0] ?? "")) {
    throw new Error(
      'This does not start with "curl". Paste the whole command, for example: curl https://api.example.com -H "Accept: application/json"',
    );
  }

  const headers: Record<string, string> = {};
  const dataParts: { value: string; urlencode: boolean }[] = [];
  const formParts: FormPart[] = [];
  const warnings: string[] = [];

  let method = "";
  let url = "";
  let auth: { user: string; pass: string } | null = null;
  let bearer: string | null = null;
  let insecure = false;
  let followRedirects = false;
  let asQuery = false;

  const valueAfter = (i: number, flag: string) => {
    if (i + 1 >= tokens.length) throw new Error(`${flag} is missing its value.`);
    return tokens[i + 1];
  };

  for (let i = 1; i < tokens.length; i++) {
    let token = tokens[i];
    if (!token) continue;

    if (/^--[a-z0-9-]+=/i.test(token)) {
      const at = token.indexOf("=");
      tokens.splice(i + 1, 0, token.slice(at + 1));
      token = token.slice(0, at);
    }

    if (BOOL_FLAGS.has(token)) {
      if (token === "-k" || token === "--insecure") insecure = true;
      if (token === "-L" || token === "--location") followRedirects = true;
      if (token === "-G" || token === "--get") asQuery = true;
      if ((token === "-I" || token === "--head") && !method) method = "HEAD";
      continue;
    }

    if (SKIPPED_VALUE_FLAGS.has(token)) {
      warnings.push(`Ignored ${token} — it has no equivalent in code.`);
      i++;
      continue;
    }

    if (token === "-X" || token === "--request") {
      method = valueAfter(i++, token).toUpperCase();
      continue;
    }

    if (token === "--url") {
      url = valueAfter(i++, token);
      continue;
    }

    if (token === "-H" || token === "--header") {
      const header = valueAfter(i++, token);
      const at = header.indexOf(":");

      if (at === -1) {
        warnings.push(`Ignored header "${header}" — it has no colon.`);
        continue;
      }

      const name = header.slice(0, at).trim();
      if (name) headers[name] = header.slice(at + 1).trim();
      continue;
    }

    if (token === "-A" || token === "--user-agent") {
      headers["User-Agent"] = valueAfter(i++, token);
      continue;
    }

    if (token === "-e" || token === "--referer") {
      headers["Referer"] = valueAfter(i++, token).replace(/;auto$/, "");
      continue;
    }

    if (token === "-b" || token === "--cookie") {
      const value = valueAfter(i++, token);

      if (value.includes("=")) headers["Cookie"] = value;
      else warnings.push(`Ignored --cookie ${value} — reading cookies from a file has no code equivalent.`);
      continue;
    }

    if (token === "-u" || token === "--user") {
      const pair = valueAfter(i++, token);
      const at = pair.indexOf(":");

      auth = {
        user: at === -1 ? pair : pair.slice(0, at),
        pass: at === -1 ? "" : pair.slice(at + 1),
      };
      continue;
    }

    if (token === "--oauth2-bearer") {
      bearer = valueAfter(i++, token);
      continue;
    }

    if (token === "--json") {
      dataParts.push({ value: valueAfter(i++, token), urlencode: false });
      headers["Content-Type"] ??= "application/json";
      headers["Accept"] ??= "application/json";
      continue;
    }

    if (
      token === "-d" || token === "--data" || token === "--data-raw" ||
      token === "--data-binary" || token === "--data-ascii" || token === "--data-urlencode"
    ) {
      const value = valueAfter(i++, token);

      if (value.startsWith("@") && token !== "--data-urlencode" && token !== "--data-raw") {
        warnings.push(
          `Ignored ${token} ${value} — the body came from a file. Paste the file contents instead.`,
        );
        continue;
      }

      dataParts.push({ value, urlencode: token === "--data-urlencode" });
      continue;
    }

    if (token === "-F" || token === "--form" || token === "--form-string") {
      const [name, rest] = splitPair(valueAfter(i++, token));
      const isFile = token !== "--form-string" && /^[@<]/.test(rest);
      const type = /;type=([^;]+)/.exec(rest);

      formParts.push({
        name,
        value: isFile ? rest.slice(1).split(";")[0] : rest,
        isFile,
        type: type ? type[1] : null,
      });
      continue;
    }

    if (/^-[a-zA-Z]{2,}$/.test(token)) {
      const letters = token.slice(1).split("");

      if (letters.every((letter) => BOOL_FLAGS.has("-" + letter))) {
        tokens.splice(i + 1, 0, ...letters.map((letter) => "-" + letter));
        continue;
      }
    }

    if (token.startsWith("-") && token.length > 1) {
      warnings.push(`Ignored unsupported option ${token}.`);
      continue;
    }

    if (!url) url = token;
    else if (looksLikeUrl(token)) warnings.push(`Ignored extra URL ${token} — only the first is converted.`);
  }

  if (!url) {
    throw new Error("No URL found. cURL needs one, for example: curl https://api.example.com/v1/users");
  }

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = "https://" + url.replace(/^\/+/, "");

  const rawBody = dataParts
    .map((part) => (part.urlencode ? encodeUrlencoded(part.value) : part.value))
    .join("&");

  if (asQuery && dataParts.length) url += (url.includes("?") ? "&" : "?") + rawBody;

  if (auth) headers["Authorization"] = "Basic " + base64(`${auth.user}:${auth.pass}`);
  if (bearer) headers["Authorization"] = "Bearer " + bearer;

  let body: Body | null = null;

  if (formParts.length) {
    body = { kind: "multipart", parts: formParts };

    // the HTTP client writes its own boundary, so a pasted one would be wrong
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === "content-type" && /multipart\/form-data/i.test(headers[name])) {
        delete headers[name];
      }
    }
  } else if (dataParts.length && !asQuery) {
    const contentType = headerValue(headers, "content-type") || "";

    if (/json/i.test(contentType) || (!contentType && /^\s*[[{]/.test(rawBody))) {
      try {
        body = { kind: "json", raw: rawBody, json: JSON.parse(rawBody) };
      } catch {
        body = { kind: "raw", raw: rawBody };
      }
    } else if (
      /x-www-form-urlencoded/i.test(contentType) ||
      (!contentType && /^[^=&\s]+=[^&]*(?:&[^=&\s]+=[^&]*)*$/.test(rawBody))
    ) {
      body = {
        kind: "form",
        raw: rawBody,
        pairs: rawBody
          .split("&")
          .filter(Boolean)
          .map((pair) => {
            const [key, value] = splitPair(pair);
            return [safeDecode(key), safeDecode(value)] as [string, string];
          }),
      };

      if (!contentType) headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      body = { kind: "raw", raw: rawBody };
    }
  }

  return {
    method: method || (body && !asQuery ? "POST" : "GET"),
    url,
    headers,
    body,
    insecure,
    followRedirects,
    warnings,
  };
}
