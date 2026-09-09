import { Tool, Values, empty, text } from "./types";
import { base64Decode, base64Encode, bool, str } from "./shared";

export const base64Tool: Tool = {
  slug: "base64-encoder-decoder",
  name: "Base64 Encoder / Decoder",
  category: "Auth",
  summary: "Convert text to Base64 and back again.",
  title: "Base64 Encoder and Decoder — Free Online Tool",
  description:
    "Base64 turns any text into a string of safe, plain characters so it can travel through systems that only handle text — HTTP headers, JSON fields, data URLs. Paste text to encode it, or paste Base64 to read it back. Use the URL-safe option when the result has to go into a URL or a JWT.",
  outputLabel: "Result",
  example: { input: "hello world", mode: "encode", urlsafe: false },
  inputs: [
    { key: "input", label: "Text", type: "textarea", tall: true, placeholder: "hello world" },
    {
      key: "mode",
      label: "Direction",
      type: "select",
      options: [
        { value: "encode", label: "Text → Base64" },
        { value: "decode", label: "Base64 → text" },
      ],
    },
    { key: "urlsafe", label: "URL-safe alphabet, no padding (when encoding)", type: "checkbox" },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input) return empty("Enter some text to convert.");

    if (str(values, "mode") === "decode") {
      try {
        return text(base64Decode(input));
      } catch {
        throw new Error(
          "That is not valid Base64. Check for missing characters, and remember that Base64 length is always a multiple of four once padded.",
        );
      }
    }

    const encoded = base64Encode(input);

    return text(
      bool(values, "urlsafe")
        ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        : encoded,
    );
  },
  docs: [
    {
      heading: "What Base64 is for",
      html: `<p>Base64 represents any data using 64 characters that survive being copied, pasted and sent through text-only channels. It is used for HTTP Basic auth headers, embedding small images in CSS as <code>data:</code> URLs, and the header and payload of every <a href="/tools/jwt-decoder">JWT</a>.</p>
      <p>It makes data about a third larger, because every three bytes become four characters.</p>`,
    },
    {
      heading: "Base64 is not encryption",
      html: `<p>This is the most important thing to know. Anyone can decode Base64 — you just did. It hides nothing. If you find a password stored as Base64, it is stored in plain text with an extra step. Use it to make data safe to <em>transport</em>, never to keep it secret.</p>`,
    },
    {
      heading: "URL-safe Base64",
      html: `<p>Standard Base64 uses <code>+</code> and <code>/</code>, which both have their own meaning inside a URL, and <code>=</code> padding that often has to be escaped. The URL-safe variant swaps them for <code>-</code> and <code>_</code> and drops the padding. This is what JWTs use. Decoding here accepts either form, so you do not have to convert it back first.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why does my decoded text look like nonsense?",
      a: "The input was probably not text to begin with — Base64 is often used for binary data such as images or encrypted bytes, which cannot be shown as readable characters.",
    },
    {
      q: "Does it handle emoji and non-English characters?",
      a: "Yes. The text is encoded as UTF-8 first, which is what every modern API expects.",
    },
  ],
};

export const urlEncoder: Tool = {
  slug: "url-encoder-decoder",
  name: "URL Encoder / Decoder",
  category: "Auth",
  summary: "Percent-encode text for a URL, or decode the %20s back into readable text.",
  title: "URL Encoder and Decoder — Percent Encoding Tool",
  description:
    "URLs can only contain a limited set of characters, so spaces, ampersands and anything non-English have to be escaped as percent codes. Paste text to encode it for use in a URL or query string, or paste an encoded URL to read what it actually says.",
  outputLabel: "Result",
  example: { input: "name=Aman & role=admin/dev?x=1", mode: "encode", component: true },
  inputs: [
    {
      key: "input",
      label: "Text or URL",
      type: "textarea",
      tall: true,
      placeholder: "hello world & more",
    },
    {
      key: "mode",
      label: "Direction",
      type: "select",
      options: [
        { value: "encode", label: "Encode" },
        { value: "decode", label: "Decode" },
      ],
    },
    {
      key: "component",
      label: "Treat it as one value, escaping & = ? / :",
      type: "checkbox",
      value: true,
    },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input) return empty("Enter some text to convert.");

    const component = bool(values, "component");

    try {
      if (str(values, "mode") === "decode") {
        return text(component ? decodeURIComponent(input) : decodeURI(input));
      }

      return text(component ? encodeURIComponent(input) : encodeURI(input));
    } catch {
      throw new Error(
        "That contains a broken percent sequence — a % must be followed by two hex digits, as in %20.",
      );
    }
  },
  docs: [
    {
      heading: "Which option do I want?",
      html: `<p>Keep the checkbox <strong>on</strong> when you are encoding a single value that will be dropped into a URL — a search term, an email address, a redirect target. It escapes <code>&amp;</code>, <code>=</code>, <code>?</code>, <code>/</code> and <code>:</code>, which is essential: an unescaped <code>&amp;</code> inside a value would look like the start of a new parameter and quietly break the URL.</p>
      <p>Turn it <strong>off</strong> when you are encoding a whole URL and want to keep its structure intact, escaping only genuinely invalid characters such as spaces.</p>`,
    },
    {
      heading: "Common escapes",
      html: `<ul class="list">
        <li>space → <code>%20</code> (or <code>+</code> in a form-encoded body)</li>
        <li><code>&amp;</code> → <code>%26</code>, <code>=</code> → <code>%3D</code>, <code>?</code> → <code>%3F</code></li>
        <li><code>/</code> → <code>%2F</code>, <code>:</code> → <code>%3A</code>, <code>#</code> → <code>%23</code></li>
        <li><code>%</code> itself → <code>%25</code></li>
      </ul>
      <p>To pull an existing URL apart instead, use the <a href="/tools/url-parser">URL parser</a>.</p>`,
    },
    {
      heading: "Double encoding",
      html: `<p>If you see <code>%2520</code> in a URL, something encoded an already-encoded string: the <code>%</code> of <code>%20</code> became <code>%25</code>. Decoding it once gives you <code>%20</code>, and twice gives you the space. Encoding the same value twice is one of the most common causes of a value arriving mangled.</p>`,
    },
  ],
  faqs: [
    {
      q: "Should a space be %20 or +?",
      a: "%20 everywhere in a URL. The + form is only correct inside an application/x-www-form-urlencoded body, which is what HTML forms post. Decoding here accepts both.",
    },
    {
      q: "Do I need to encode the whole URL?",
      a: "No, and you should not — encoding a full URL as a single value escapes the slashes and colon and produces something that is no longer a URL. Encode individual values, then assemble them.",
    },
  ],
};

export const basicAuth: Tool = {
  slug: "basic-auth-generator",
  name: "Basic Auth Generator",
  category: "Auth",
  summary: "Turn a username and password into an Authorization header — or read one back.",
  title: "Basic Auth Header Generator and Decoder",
  description:
    "HTTP Basic authentication sends your username and password as a single Base64 string in the Authorization header. Enter a username and password to get the exact header to paste into a request, or paste an existing header to see which credentials it contains.",
  outputLabel: "Header",
  example: { user: "admin", pass: "s3cret", decode: "" },
  inputs: [
    { key: "user", label: "Username", type: "text", placeholder: "admin" },
    { key: "pass", label: "Password", type: "text", placeholder: "s3cret" },
    {
      key: "decode",
      label: "Or paste an existing header to decode it",
      type: "text",
      placeholder: "Basic YWRtaW46czNjcmV0",
    },
  ],
  run(values: Values) {
    const toDecode = str(values, "decode").trim();

    if (toDecode) {
      let decoded: string;

      try {
        decoded = base64Decode(toDecode.replace(/^Basic\s+/i, ""));
      } catch {
        throw new Error("That is not valid Base64, so it cannot be a Basic auth header.");
      }

      const at = decoded.indexOf(":");

      return text(
        `Username: ${at === -1 ? decoded : decoded.slice(0, at)}\nPassword: ${
          at === -1 ? "(none)" : decoded.slice(at + 1)
        }`,
      );
    }

    const user = str(values, "user");
    const pass = str(values, "pass");

    if (!user && !pass) return empty("Enter a username and password.");

    const encoded = base64Encode(`${user}:${pass}`);

    return text(`Authorization: Basic ${encoded}

# curl, with the header spelled out
curl -H 'Authorization: Basic ${encoded}' https://api.example.com

# curl, letting it build the header for you
curl -u '${user}:${pass}' https://api.example.com`);
  },
  docs: [
    {
      heading: "How Basic auth works",
      html: `<p>The username and password are joined with a colon, encoded as Base64, and sent with the word <code>Basic</code> in front:</p>
      <pre><code>Authorization: Basic dXNlcjpwYXNz</code></pre>
      <p>That is the whole scheme. There is no hashing and no challenge — which is why it must only ever be used over HTTPS. Over plain HTTP, anyone watching the connection can read the credentials by decoding one string.</p>`,
    },
    {
      heading: "Passwords containing a colon",
      html: `<p>The <em>first</em> colon separates username from password, so a password may contain colons but a username may not. If your username has one, Basic auth cannot represent it and the server will read it wrongly.</p>`,
    },
    {
      heading: "When to use something else",
      html: `<p>Basic auth sends the password on every single request, which means every service in the chain handles it. For anything user-facing, a token-based scheme is better: the credentials are exchanged once for a short-lived token, and only the token travels. See the <a href="/tools/jwt-decoder">JWT decoder</a> for what those look like.</p>`,
    },
  ],
  faqs: [
    {
      q: "Is Base64 here providing any security?",
      a: "None at all. It is an encoding, not encryption, and it exists only so the credentials survive being put in a header. HTTPS is what actually protects them.",
    },
    {
      q: "Can I put credentials directly in the URL?",
      a: "https://user:pass@example.com still works in curl, but browsers have removed support and it leaks the password into logs and browser history. Use the header instead.",
    },
  ],
};
