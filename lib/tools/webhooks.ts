import { Block, Cell, Tool, Values, blocks, empty, text } from "./types";
import { parseHeaderLines, parseJson, pretty, str } from "./shared";
import { statusTone } from "../http-status";

const EXAMPLE = JSON.stringify({
  id: "evt_1a2b3c",
  type: "invoice.paid",
  created: 1735689600,
  data: { object: { id: "in_998", amount_paid: 4200, currency: "eur" } },
});

async function hmac(algorithm: string, secret: string, message: string, encoding: "hex" | "base64") {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser has no Web Crypto support, so signatures cannot be computed here.");
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));

  if (encoding === "base64") {
    let binary = "";
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
  }

  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const webhookFormatter: Tool = {
  slug: "webhook-payload-formatter",
  name: "Webhook Payload Formatter",
  category: "Webhooks",
  summary: "Make sense of a webhook payload from your logs, whatever shape it arrived in.",
  title: "Webhook Payload Formatter — Read Any Webhook Body",
  description:
    "Webhook bodies turn up in logs as one long line, sometimes JSON, sometimes form-encoded, sometimes JSON that has been encoded as a string. Paste whatever you have and this works out the format, pretty-prints it, and pulls out the event type, ID and timestamp so you can see what the event was.",
  outputLabel: "Formatted payload",
  example: { input: EXAMPLE },
  inputs: [
    {
      key: "input",
      label: "Raw payload",
      type: "textarea",
      tall: true,
      placeholder: EXAMPLE,
    },
  ],
  run(values: Values) {
    const input = str(values, "input").trim();
    if (!input) return empty("Paste a webhook payload.");

    let data: unknown;

    if (input.startsWith("{") || input.startsWith("[")) {
      data = parseJson(input, "the payload");
    } else if (input.includes("=")) {
      const object: Record<string, unknown> = {};

      for (const [key, value] of new URLSearchParams(input).entries()) {
        try {
          object[key] = JSON.parse(value);
        } catch {
          object[key] = value;
        }
      }

      data = object;
    } else {
      throw new Error(
        "This does not look like JSON or form-encoded data. JSON starts with { or [, and form data looks like key=value&other=value.",
      );
    }

    // some providers send JSON that was itself encoded as a JSON string
    if (typeof data === "string") data = parseJson(data, "the payload");

    const record = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const pick = (...keys: string[]) => keys.map((key) => record[key]).find((v) => v != null);

    const summary: Cell[][] = [];
    const type = pick("type", "event", "event_type", "action");
    const id = pick("id", "event_id");
    const created = pick("created", "timestamp", "created_at");

    if (type != null) summary.push(["Event type", String(type)]);
    if (id != null) summary.push(["Event id", String(id)]);

    if (created != null) {
      const seconds = String(created);
      const stamp = /^\d{9,10}$/.test(seconds)
        ? `${seconds} (${new Date(Number(seconds) * 1000).toISOString()})`
        : seconds;
      summary.push(["Created", stamp]);
    }

    const out: Block[] = [];

    if (summary.length) {
      out.push({ kind: "heading", text: "Summary" });
      out.push({ kind: "table", rows: summary });
    }

    out.push({ kind: "heading", text: "Payload" });
    out.push({ kind: "code", text: pretty(data) });

    return blocks(out, pretty(data));
  },
  docs: [
    {
      heading: "Why payloads look so different",
      html: `<p>Most providers send JSON, but not all. Older systems and some form-based integrations send <code>application/x-www-form-urlencoded</code> bodies, and a few send JSON wrapped inside a single form field. All three are handled here, so you do not have to work out which you have before you can read it.</p>`,
    },
    {
      heading: "Do not reformat before verifying",
      html: `<p>This is the mistake that breaks signature checks. A webhook signature is computed over the <em>exact bytes</em> the provider sent. Pretty-print the body first and the signature will never match, even though the data is unchanged. Verify the raw body, then parse it. Most frameworks need a specific setting to give you the raw body at all.</p>`,
    },
  ],
  faqs: [
    {
      q: "Is my payload uploaded anywhere?",
      a: "No. It is parsed in your browser, which matters because webhook payloads routinely contain customer emails and payment details.",
    },
    {
      q: "What does the created timestamp mean?",
      a: "It is normally Unix time in seconds, which is why it is also shown as a readable UTC date. The Unix timestamp converter handles other formats.",
    },
  ],
};

export const webhookSignature: Tool = {
  slug: "webhook-signature-generator",
  name: "Webhook Signature Generator",
  category: "Webhooks",
  summary: "Produce a provider-style signature header so you can test your verification code.",
  title: "Webhook Signature Generator — Stripe, GitHub, Shopify",
  description:
    "To test that your webhook endpoint rejects forged requests, you need a correctly signed request to compare against. Paste a payload and your signing secret, choose the provider whose format you are copying, and get the exact header value it would send.",
  outputLabel: "Signature header",
  example: { payload: EXAMPLE, secret: "whsec_test_secret", style: "stripe", timestamp: "" },
  inputs: [
    {
      key: "payload",
      label: "Payload, exactly as it will be sent",
      type: "textarea",
      tall: true,
      placeholder: EXAMPLE,
    },
    { key: "secret", label: "Signing secret", type: "text", placeholder: "whsec_..." },
    {
      key: "style",
      label: "Provider format",
      type: "select",
      options: [
        { value: "stripe", label: "Stripe — t=…,v1=… signed over timestamp.payload" },
        { value: "github", label: "GitHub — X-Hub-Signature-256: sha256=…" },
        { value: "shopify", label: "Shopify — base64 HMAC-SHA256" },
        { value: "plain", label: "Plain hex HMAC-SHA256" },
      ],
    },
    {
      key: "timestamp",
      label: "Timestamp for the Stripe format, blank for now",
      type: "text",
      placeholder: "1735689600",
    },
  ],
  async run(values: Values) {
    const payload = str(values, "payload");
    const secret = str(values, "secret");

    if (!payload.trim()) return empty("Paste the payload you want to sign.");
    if (!secret) return empty("Enter the signing secret.");

    const style = str(values, "style");

    if (style === "stripe") {
      const timestamp = str(values, "timestamp").trim() || String(Math.floor(Date.now() / 1000));
      const signature = await hmac("SHA-256", secret, `${timestamp}.${payload}`, "hex");

      return text(`Stripe-Signature: t=${timestamp},v1=${signature}

The signed string is the timestamp, a dot, then the raw body:
${timestamp}.<raw body>

To verify, rebuild that string, recompute HMAC-SHA256 with your secret,
and compare using a constant-time equality check.`);
    }

    if (style === "github") {
      return text(`X-Hub-Signature-256: sha256=${await hmac("SHA-256", secret, payload, "hex")}`);
    }

    if (style === "shopify") {
      return text(`X-Shopify-Hmac-Sha256: ${await hmac("SHA-256", secret, payload, "base64")}`);
    }

    return text(await hmac("SHA-256", secret, payload, "hex"));
  },
  docs: [
    {
      heading: "How webhook signatures work",
      html: `<p>The provider and you share a secret. Before sending, the provider computes an HMAC of the request body using that secret and puts the result in a header. You recompute the same HMAC on arrival: if it matches, the request genuinely came from them and was not altered.</p>
      <p>Anyone can send an HTTP request to your endpoint, so without this check your webhook handler will happily act on invented events.</p>`,
    },
    {
      heading: "Two rules people get wrong",
      html: `<ul class="list">
        <li><strong>Sign the raw body.</strong> Not the parsed object, not a re-serialised version. One reordered key or one added space and the signature will not match.</li>
        <li><strong>Compare in constant time.</strong> Use <code>crypto.timingSafeEqual</code> in Node, <code>hmac.compare_digest</code> in Python. A normal <code>===</code> returns as soon as it finds a difference, which leaks information about the correct value.</li>
      </ul>`,
    },
    {
      heading: "Why Stripe includes a timestamp",
      html: `<p>A signature on its own proves the request is genuine but not that it is recent, so a captured request could be replayed later. Stripe signs the timestamp together with the body, and you reject anything older than a few minutes. The timestamp is inside the signed string, so an attacker cannot change it.</p>`,
    },
  ],
  faqs: [
    {
      q: "Does the secret leave my browser?",
      a: "No. The HMAC is computed with the browser's built-in Web Crypto, so the secret and payload stay on your machine. Even so, prefer a test secret over a production one.",
    },
    {
      q: "My signature does not match the real one. Why?",
      a: "Almost always the payload. Compare byte for byte — a trailing newline, different key order, or an escaped character is enough to change the result.",
    },
  ],
};

export const hmacGenerator: Tool = {
  slug: "hmac-generator",
  name: "HMAC Generator",
  category: "Webhooks",
  summary: "Compute an HMAC digest of a message with a secret key.",
  title: "HMAC Generator — SHA-256, SHA-1, SHA-512 Online",
  description:
    "An HMAC proves that a message came from someone holding the shared secret and has not been changed. Enter a message and a key, pick a hash, and get the digest in both hex and Base64 — the two formats APIs ask for.",
  outputLabel: "Digest",
  example: { message: "hello world", secret: "topsecret", algorithm: "SHA-256" },
  inputs: [
    { key: "message", label: "Message", type: "textarea", tall: true, placeholder: "hello world" },
    { key: "secret", label: "Secret key", type: "text", placeholder: "topsecret" },
    {
      key: "algorithm",
      label: "Hash",
      type: "select",
      options: ["SHA-256", "SHA-1", "SHA-384", "SHA-512"].map((value) => ({ value, label: value })),
    },
  ],
  async run(values: Values) {
    const message = str(values, "message");
    const secret = str(values, "secret");

    if (!message) return empty("Enter a message.");
    if (!secret) return empty("Enter a secret key.");

    const algorithm = str(values, "algorithm") || "SHA-256";
    const hex = await hmac(algorithm, secret, message, "hex");
    const base64 = await hmac(algorithm, secret, message, "base64");

    return text(`hex:    ${hex}

base64: ${base64}

${hex.length / 2} bytes, HMAC-${algorithm.replace("-", "")}`);
  },
  docs: [
    {
      heading: "HMAC is not a hash of the secret",
      html: `<p>It is tempting to write <code>sha256(secret + message)</code>, and it is a real weakness — that construction is vulnerable to length-extension attacks, where an attacker appends data to your message and produces a valid digest without knowing the secret. HMAC uses the key twice in a specific arrangement that closes that hole. Always use a library's HMAC function rather than gluing strings together.</p>`,
    },
    {
      heading: "Which hash to pick",
      html: `<p><strong>SHA-256</strong> unless something requires otherwise. SHA-1 is still found in older APIs and is acceptable inside HMAC, but there is no reason to choose it for something new. SHA-384 and SHA-512 are stronger and slower; the extra strength rarely matters here.</p>`,
    },
    {
      heading: "Hex or Base64",
      html: `<p>Both encode the same bytes. Hex is twice as long and easier to compare by eye; Base64 is shorter and common in headers. Providers differ, so check which one the API expects — the <a href="/tools/webhook-signature-generator">signature generator</a> already uses the right format for each provider.</p>`,
    },
  ],
  faqs: [
    {
      q: "Is HMAC the same as encryption?",
      a: "No. Encryption hides content and can be reversed. An HMAC only proves authenticity and integrity, and cannot be reversed — you cannot recover the message from the digest.",
    },
    {
      q: "Should I use this for password storage?",
      a: "No. Passwords need a deliberately slow algorithm such as bcrypt, scrypt or Argon2. HMAC is fast by design, which is exactly wrong for hashing passwords.",
    },
  ],
};

export const webhookTester: Tool = {
  slug: "webhook-tester",
  name: "Webhook Tester",
  category: "Webhooks",
  summary: "Send a test webhook to your endpoint and see exactly how it replies.",
  title: "Webhook Tester — Send a Test Webhook Request",
  description:
    "Send a real HTTP request to your own endpoint without waiting for a provider to fire an event. Set the URL, method, headers and payload, optionally sign it, then press Run and read the status, headers and body that come back. The request goes straight from your browser to the URL you enter.",
  outputLabel: "Response",
  manual: true,
  example: {
    url: "https://webhook.site/your-unique-id",
    method: "POST",
    headers: "Content-Type: application/json",
    payload: EXAMPLE,
    secret: "",
  },
  inputs: [
    { key: "url", label: "Target URL", type: "text", placeholder: "https://webhook.site/..." },
    {
      key: "method",
      label: "Method",
      type: "select",
      options: ["POST", "PUT", "PATCH", "GET", "DELETE"].map((value) => ({ value, label: value })),
    },
    {
      key: "headers",
      label: "Headers, one per line",
      type: "textarea",
      value: "Content-Type: application/json",
    },
    { key: "payload", label: "Payload", type: "textarea", tall: true, placeholder: EXAMPLE },
    {
      key: "secret",
      label: "Sign with a secret, adding X-Hub-Signature-256 (optional)",
      type: "text",
      placeholder: "leave blank to skip",
      hint: "The request is sent by your browser, so the target must allow cross-origin requests.",
    },
  ],
  async run(values: Values) {
    const url = str(values, "url").trim();
    if (!url) return empty("Enter a target URL, add a payload, then press Run to send it.");

    const method = str(values, "method") || "POST";
    const headers = parseHeaderLines(str(values, "headers"));
    const payload = str(values, "payload");

    const body = !["GET", "HEAD"].includes(method) && payload.trim() ? payload : undefined;
    const secret = str(values, "secret");

    if (secret && body !== undefined) {
      headers["X-Hub-Signature-256"] = "sha256=" + (await hmac("SHA-256", secret, body, "hex"));
    }

    const started = performance.now();
    let response: Response;

    try {
      response = await fetch(url, { method, headers, body });
    } catch (error) {
      return blocks([
        { kind: "heading", text: "The request could not be completed", tone: "error" },
        { kind: "text", text: (error as Error).message },
        {
          kind: "text",
          text: "This is nearly always CORS or an unreachable host. Your request may well have arrived — the browser is just not allowed to show you the response. Check your server logs to be sure.",
          muted: true,
        },
      ]);
    }

    const elapsed = Math.round(performance.now() - started);
    let bodyText = await response.text();

    try {
      bodyText = pretty(JSON.parse(bodyText));
    } catch {
      // not JSON, leave it alone
    }

    const responseHeaders = [...response.headers.entries()];

    return blocks([
      {
        kind: "heading",
        text: `${response.status} ${response.statusText}`.trim(),
        tone: statusTone(response.status),
      },
      { kind: "text", text: `Took ${elapsed} ms.`, muted: true },
      responseHeaders.length
        ? { kind: "table", head: ["Header", "Value"], rows: responseHeaders }
        : { kind: "text", text: "No readable headers — CORS hides them from the page.", muted: true },
      { kind: "heading", text: "Body" },
      { kind: "code", text: bodyText || "(empty)" },
    ]);
  },
  docs: [
    {
      heading: "This is the one tool that sends data",
      html: `<p>Every other tool on this site works entirely offline. This one exists to make a request, so it does: your browser sends it directly to the URL you type. It does not pass through this site, and nothing is stored here — but the URL you enter will receive whatever you put in the payload, so point it at your own endpoint.</p>`,
    },
    {
      heading: "About CORS",
      html: `<p>Because the request comes from a web page, the browser applies the same-origin policy. If your endpoint does not return <code>Access-Control-Allow-Origin</code>, the request still <em>arrives</em> but the browser refuses to show you the response, and you will see a failure here.</p>
      <p>That is genuinely confusing the first time. If you get an error, check your server logs before assuming nothing was sent. To test without CORS in the way, use the <a href="/tools/curl-to-code">generated cURL command</a> from your terminal instead.</p>`,
    },
    {
      heading: "Testing without an endpoint yet",
      html: `<p>Services such as webhook.site give you a throwaway URL that accepts anything and shows you what arrived. They are useful for checking what a provider actually sends before you write the handler. Do not send real customer data to them.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why does it only run when I press Run?",
      a: "Because it sends a real request. Every other tool updates as you type, which would mean firing requests at your server on every keystroke.",
    },
    {
      q: "Can I test that my signature verification works?",
      a: "Yes — that is what the secret field is for. Send one request signed with the right secret and one with the wrong one; your endpoint should accept the first and reject the second.",
    },
  ],
};
