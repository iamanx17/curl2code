import { Block, Cell, Tool, Values, blocks, empty, text } from "./types";
import { parseHeaderLines, parseJson, pretty, str } from "./shared";
import { HTTP_STATUS, statusTone } from "../http-status";
import { parseCurl } from "../curl/parse";
import { axios, fetchJs, python } from "../curl/generate";

const shellQuote = (value: string) => "'" + value.replace(/'/g, `'\\''`) + "'";

export const requestBuilder: Tool = {
  slug: "http-request-builder",
  name: "HTTP Request Builder",
  category: "API",
  summary: "Fill in a method, URL, headers and body, and get a cURL command or code.",
  title: "HTTP Request Builder — Build cURL or Code From Parts",
  description:
    "The reverse of the cURL converter: instead of pasting a command, you fill in the parts. Choose a method, type a URL, add headers one per line and paste a body, then take the result away as a cURL command or as JavaScript, Axios or Python code.",
  outputLabel: "Request",
  example: {
    method: "POST",
    url: "https://api.example.com/v1/users",
    headers: "Content-Type: application/json\nAuthorization: Bearer YOUR_TOKEN",
    body: '{"name":"Aman","email":"aman@example.com"}',
    format: "curl",
  },
  inputs: [
    {
      key: "method",
      label: "Method",
      type: "select",
      options: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((value) => ({
        value,
        label: value,
      })),
    },
    { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/v1/users" },
    {
      key: "headers",
      label: "Headers, one per line as Key: Value",
      type: "textarea",
      placeholder: "Content-Type: application/json",
    },
    { key: "body", label: "Body", type: "textarea", placeholder: '{"name":"Aman"}' },
    {
      key: "format",
      label: "Give me",
      type: "select",
      options: [
        { value: "curl", label: "a cURL command" },
        { value: "fetch", label: "JavaScript fetch()" },
        { value: "axios", label: "Axios" },
        { value: "python", label: "Python requests" },
      ],
    },
  ],
  run(values: Values) {
    const url = str(values, "url").trim();
    if (!url) return empty("Enter a URL to build a request.");

    const method = str(values, "method") || "GET";
    const body = str(values, "body").trim();

    const parts = [`curl -X ${method} ${shellQuote(url)}`];

    for (const [key, value] of Object.entries(parseHeaderLines(str(values, "headers")))) {
      parts.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
    }

    if (body) parts.push(`  --data-raw ${shellQuote(body)}`);

    const curl = parts.join(" \\\n");
    const format = str(values, "format");

    // the code formats go through the same parser as the converter, so both agree
    if (format === "fetch") return text(fetchJs(parseCurl(curl)));
    if (format === "axios") return text(axios(parseCurl(curl)));
    if (format === "python") return text(python(parseCurl(curl)));

    return text(curl);
  },
  docs: [
    {
      heading: "When this is easier than writing cURL",
      html: `<p>Quoting is the reason. A JSON body inside a shell command needs the quotes nested correctly, and getting it wrong produces errors that look like API problems but are really shell problems. Here you paste the body as-is and the quoting is handled for you.</p>
      <p>It is also a quick way to see the same request in four forms at once — useful when a request works in your terminal but not in your code, or the other way round.</p>`,
    },
    {
      heading: "Headers",
      html: `<p>One per line, in the form <code>Name: value</code>. Lines without a colon are ignored, and a line starting with <code>#</code> is treated as a comment so you can keep a header around without sending it. The two you will use most:</p>
      <ul class="list">
        <li><code>Content-Type: application/json</code> — tells the server how to read your body. Missing this is the most common cause of a 415.</li>
        <li><code>Authorization: Bearer …</code> — your token. Use the <a href="/tools/basic-auth-generator">Basic auth generator</a> if the API wants a username and password instead.</li>
      </ul>`,
    },
  ],
  faqs: [
    {
      q: "Does this send the request?",
      a: "No. It only writes it out. To actually send something from the browser, use the webhook tester.",
    },
    {
      q: "Why does the generated cURL use --data-raw?",
      a: "Because -d would interpret an @ at the start of your body as 'read from this file'. --data-raw sends exactly the text you typed.",
    },
  ],
};

export const headerParser: Tool = {
  slug: "http-header-parser",
  name: "HTTP Header Parser",
  category: "API",
  summary: "Paste a wall of raw headers and get a readable table plus JSON.",
  title: "HTTP Header Parser — Read Raw Headers as a Table",
  description:
    "Copy the header block from curl -i, your browser's network panel or a log, and paste it here. You get every header as a sorted table, the status line explained if there is one, and the whole thing as a JSON object you can paste into code or a test.",
  outputLabel: "Parsed headers",
  example: {
    raw: "HTTP/1.1 200 OK\nContent-Type: application/json; charset=utf-8\nCache-Control: max-age=60, public\nX-RateLimit-Remaining: 42\nSet-Cookie: session=abc123; Path=/; HttpOnly",
  },
  inputs: [
    {
      key: "raw",
      label: "Raw headers",
      type: "textarea",
      tall: true,
      placeholder: "Content-Type: application/json",
    },
  ],
  run(values: Values) {
    const raw = str(values, "raw");
    if (!raw.trim()) return empty("Paste a block of headers.");

    const lines = raw.split(/\r?\n/).filter((line) => line.trim());
    const status = /^HTTP\/[\d.]+\s/i.test(lines[0] ?? "") ? lines.shift()!.trim() : null;
    const headers = parseHeaderLines(lines.join("\n"));

    if (!Object.keys(headers).length) {
      return empty("No headers found. Each line should look like: Name: value");
    }

    const rows: Cell[][] = Object.entries(headers).map(([key, value]) => [key, value]);

    const code = status ? Number(status.split(/\s+/)[1]) : NaN;
    const known = HTTP_STATUS[code];

    const out: Block[] = [];

    if (status) {
      out.push({ kind: "heading", text: status, tone: statusTone(code) });
      if (known) out.push({ kind: "text", text: known[1], muted: true });
    }

    out.push({ kind: "table", head: ["Header", "Value"], rows });
    out.push({ kind: "heading", text: "As JSON" });
    out.push({ kind: "code", text: pretty(headers) });

    return blocks(out, pretty(headers));
  },
  docs: [
    {
      heading: "Headers worth looking at first",
      html: `<ul class="list">
        <li><code>Content-Type</code> — how to read the body. If this says <code>text/html</code> when you expected JSON, you are probably looking at an error page.</li>
        <li><code>Cache-Control</code> — how long the response may be reused. <code>no-store</code> means never.</li>
        <li><code>X-RateLimit-*</code> and <code>Retry-After</code> — how much quota you have left and when to try again.</li>
        <li><code>Location</code> — where a redirect points, or the URL of something you just created.</li>
        <li><code>Set-Cookie</code> — check for <code>HttpOnly</code> and <code>Secure</code> on anything session related.</li>
      </ul>`,
    },
    {
      heading: "Where to get the raw block",
      html: `<p><code>curl -i https://example.com</code> prints the headers before the body, and <code>curl -I</code> prints only the headers. In Chrome or Firefox, open the network panel, click a request and use "Copy request headers" or "Copy response headers".</p>
      <p>If you have a whole response including the body, the <a href="/tools/http-response-formatter">response formatter</a> splits it up for you.</p>`,
    },
  ],
  faqs: [
    {
      q: "Are header names case sensitive?",
      a: "No — content-type and Content-Type are the same header. They are shown here exactly as you pasted them so you can see what the server actually sent.",
    },
    {
      q: "Why do I see the same header twice?",
      a: "Some headers legitimately repeat, Set-Cookie especially. Only the last one survives in the JSON view, because a JSON object cannot hold duplicate keys.",
    },
  ],
};

export const urlParser: Tool = {
  slug: "url-parser",
  name: "URL Parser",
  category: "API",
  summary: "Break a long URL into its parts and list every query parameter.",
  title: "URL Parser — Split a URL Into Its Parts",
  description:
    "Paste a long URL and see it taken apart: scheme, host, port, path and fragment, plus a table of every query parameter with its value already decoded. Much faster than counting ampersands in a URL that runs off the edge of your screen.",
  outputLabel: "URL parts",
  example: {
    url: "https://user:pw@api.example.com:8443/v1/users?page=2&limit=50&q=hello%20world#results",
  },
  inputs: [
    {
      key: "url",
      label: "URL",
      type: "textarea",
      placeholder: "https://api.example.com/v1/users?page=2",
    },
  ],
  run(values: Values) {
    const input = str(values, "url").trim();
    if (!input) return empty("Paste a URL to pull it apart.");

    let url: URL;

    try {
      url = new URL(input);
    } catch {
      throw new Error(
        "That is not a complete URL. Include the scheme at the front, for example https://example.com/path",
      );
    }

    const parts: [string, string][] = [
      ["Scheme", url.protocol.replace(":", "")],
      ["Username", url.username],
      ["Password", url.password],
      ["Host", url.hostname],
      ["Port", url.port || "(default for the scheme)"],
      ["Path", url.pathname],
      ["Query", url.search],
      ["Fragment", url.hash],
    ];

    const params = [...url.searchParams.entries()];
    const segments = url.pathname.split("/").filter(Boolean);

    return blocks([
      { kind: "table", head: ["Part", "Value"], rows: parts.map(([k, v]) => [k, v || "—"]) },
      { kind: "heading", text: "Path segments" },
      { kind: "code", text: pretty(segments) },
      { kind: "heading", text: "Query parameters" },
      params.length
        ? { kind: "table", head: ["Key", "Value"], rows: params.map(([k, v]) => [k, v]) }
        : { kind: "text", text: "This URL has no query parameters.", muted: true },
    ]);
  },
  docs: [
    {
      heading: "The parts of a URL",
      html: `<pre><code>https://user:pw@api.example.com:8443/v1/users?page=2#results
└─┬─┘   └──┬──┘ └──────┬──────┘ └┬─┘└──┬───┘ └──┬─┘ └──┬──┘
scheme    userinfo     host     port  path    query  fragment</code></pre>
      <p>Two are worth remembering: the <strong>fragment</strong> after <code>#</code> is never sent to the server — it exists only in the browser, which is why you cannot read it in your backend. And <strong>userinfo</strong> is deprecated; browsers ignore it and it leaks credentials into logs.</p>`,
    },
    {
      heading: "Values are decoded for you",
      html: `<p>Parameter values are shown decoded, so <code>hello%20world</code> appears as <code>hello world</code>. That is what your server will see after it parses the query string. To go the other way and build an encoded value, use the <a href="/tools/url-encoder-decoder">URL encoder</a>.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why does it say my URL is invalid?",
      a: "Almost always a missing scheme. api.example.com/users is not a URL on its own; https://api.example.com/users is.",
    },
    {
      q: "What if a parameter appears more than once?",
      a: "Both are listed, in order. Servers disagree about what that means — some take the first, some the last, some build a list — so avoid relying on it. The query string parser shows how repeated keys collapse into an array.",
    },
  ],
};

export const queryStringParser: Tool = {
  slug: "query-string-parser",
  name: "Query String Parser",
  category: "API",
  summary: "Convert a query string into JSON, or JSON into a query string.",
  title: "Query String Parser — Query String to JSON and Back",
  description:
    "Turn everything after the question mark into a readable JSON object, with values decoded and repeated keys collected into arrays. Switch the direction to go the other way and build a properly encoded query string from a JSON object.",
  outputLabel: "Result",
  example: { input: "page=2&limit=50&tags=a&tags=b&q=hello%20world", mode: "toJson" },
  inputs: [
    {
      key: "input",
      label: "Query string or JSON object",
      type: "textarea",
      tall: true,
      placeholder: 'page=2&limit=50   or   {"page":2}',
    },
    {
      key: "mode",
      label: "Direction",
      type: "select",
      options: [
        { value: "toJson", label: "Query string → JSON" },
        { value: "toQuery", label: "JSON → query string" },
      ],
    },
  ],
  run(values: Values) {
    const input = str(values, "input").trim();
    if (!input) return empty("Paste a query string, or a JSON object to turn into one.");

    if (str(values, "mode") === "toQuery") {
      const object = parseJson(input, "a JSON object") as Record<string, unknown>;
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(object)) {
        if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
        else params.append(key, value === null ? "" : String(value));
      }

      return text(params.toString());
    }

    const query = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
    const result: Record<string, string | string[]> = {};

    for (const [key, value] of new URLSearchParams(query).entries()) {
      const existing = result[key];

      if (existing === undefined) result[key] = value;
      else result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    }

    return text(pretty(result));
  },
  docs: [
    {
      heading: "Repeated keys become arrays",
      html: `<p><code>tags=a&amp;tags=b</code> has no single correct meaning in the HTTP standard, so this tool does what most web frameworks do and collects the values into <code>["a", "b"]</code>. Some APIs instead expect <code>tags[]=a</code> or <code>tags=a,b</code>. If your values are not arriving, that difference is the first thing to check in the API's documentation.</p>`,
    },
    {
      heading: "Building a query string safely",
      html: `<p>Going from JSON to a query string encodes each value properly, so a search term containing <code>&amp;</code> or a space cannot break the URL. Nested objects are not supported, because query strings have no agreed way to express them — flatten them first, or send the data as a JSON body instead.</p>`,
    },
  ],
  faqs: [
    {
      q: "Can I paste a whole URL?",
      a: "Yes. Everything before and including the question mark is ignored. To see the rest of the URL broken down too, use the URL parser.",
    },
    {
      q: "What happens to a key with no value?",
      a: "?debug becomes an empty string, which is how browsers and most servers read it. It is not true or null.",
    },
  ],
};

export const responseFormatter: Tool = {
  slug: "http-response-formatter",
  name: "HTTP Response Formatter",
  category: "API",
  summary: "Paste a whole raw HTTP response and get the status, headers and body separated.",
  title: "HTTP Response Formatter — Split and Format a Response",
  description:
    "Paste everything curl -i printed. The status line is explained, the headers become a table, and a JSON body is pretty-printed automatically. It saves you separating the parts by hand when you are trying to work out why a request behaved unexpectedly.",
  outputLabel: "Formatted response",
  example: {
    raw: 'HTTP/1.1 201 Created\nContent-Type: application/json\nLocation: /v1/users/42\n\n{"id":42,"name":"Aman","tags":["a","b"],"active":true}',
  },
  inputs: [
    {
      key: "raw",
      label: "Raw response",
      type: "textarea",
      tall: true,
      placeholder: "HTTP/1.1 200 OK\nContent-Type: application/json\n\n{...}",
    },
  ],
  run(values: Values) {
    const raw = str(values, "raw").replace(/\r\n/g, "\n");
    if (!raw.trim()) return empty("Paste a raw HTTP response.");

    const split = raw.indexOf("\n\n");
    let head = split === -1 ? raw : raw.slice(0, split);
    let body = split === -1 ? "" : raw.slice(split + 2);

    // a paste with no headers at all is just a body
    if (!/^HTTP\/|:/.test(head.split("\n")[0] ?? "")) {
      body = raw;
      head = "";
    }

    const lines = head.split("\n").filter((line) => line.trim());
    const status = /^HTTP\//i.test(lines[0] ?? "") ? lines.shift()!.trim() : null;
    const headers = parseHeaderLines(lines.join("\n"));

    let bodyText = body.trim();

    try {
      bodyText = pretty(JSON.parse(bodyText));
    } catch {
      // not JSON, show it as it came
    }

    const code = status ? Number(status.split(/\s+/)[1]) : NaN;
    const known = HTTP_STATUS[code];

    const out: Block[] = [];

    if (status) {
      out.push({ kind: "heading", text: status, tone: statusTone(code) });
      if (known) out.push({ kind: "text", text: known[1], muted: true });
    }

    out.push(
      Object.keys(headers).length
        ? { kind: "table", head: ["Header", "Value"], rows: Object.entries(headers) }
        : { kind: "text", text: "No headers in this paste.", muted: true },
    );

    out.push({ kind: "heading", text: "Body" });
    out.push({ kind: "code", text: bodyText || "(empty)" });

    return blocks(out, bodyText);
  },
  docs: [
    {
      heading: "How to capture a full response",
      html: `<p><code>curl -i https://api.example.com/v1/users</code> prints the status line, the headers, a blank line, then the body — exactly the format this tool expects. Add <code>-s</code> to hide the progress meter.</p>
      <p>The blank line is what separates headers from body. If your paste is missing it, everything is treated as a body, which is still useful when you only want the JSON pretty-printed.</p>`,
    },
    {
      heading: "Reading the result",
      html: `<p>Start with the status. A 4xx means the request needs fixing; a 5xx means the server broke and your request is probably fine. Then check <code>Content-Type</code> — if the body is not JSON when you expected JSON, you are usually looking at an HTML error page from a proxy rather than a reply from the API itself.</p>`,
    },
  ],
  faqs: [
    {
      q: "My body is not being pretty-printed.",
      a: "It is only reformatted when it parses as JSON. If it does not, it is shown unchanged — paste it into the JSON validator to find out why.",
    },
    {
      q: "Can I paste a compressed response?",
      a: "No. If you see unreadable characters, the response was gzipped. Add --compressed to your curl command so curl decompresses it first.",
    },
  ],
};
