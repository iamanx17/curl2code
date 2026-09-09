import { Cell, Tool, Values, blocks, empty } from "./types";
import { pretty, str } from "./shared";

const EXAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFtYW4iLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function decodeSegment(segment: string, what: string) {
  let text = segment.replace(/-/g, "+").replace(/_/g, "/");
  while (text.length % 4) text += "=";

  try {
    const bytes = Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(`The ${what} could not be decoded. Check that you copied the whole token.`);
  }
}

function splitJwt(token: string) {
  const parts = token.trim().replace(/^Bearer\s+/i, "").split(".");

  if (parts.length < 2) {
    throw new Error(
      "That does not look like a JWT. A token has three parts separated by dots: header.payload.signature",
    );
  }

  return {
    header: decodeSegment(parts[0], "header"),
    payload: decodeSegment(parts[1], "payload") as Record<string, unknown>,
    signature: parts[2] || "",
  };
}

const asUtc = (seconds: number) =>
  new Date(seconds * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");

function humanDelta(seconds: number) {
  const total = Math.abs(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);

  return parts.join(" ");
}

const CLAIMS: Record<string, string> = {
  iss: "who issued the token",
  sub: "who the token is about",
  aud: "who the token is for",
  exp: "expires at",
  nbf: "not valid before",
  iat: "issued at",
  jti: "unique token id",
  scope: "what the token is allowed to do",
  azp: "authorised party",
};

const TIME_CLAIMS = ["exp", "iat", "nbf", "auth_time"];

export const jwtDecoder: Tool = {
  slug: "jwt-decoder",
  name: "JWT Decoder",
  category: "Auth",
  summary: "Paste a JWT and read what is inside it — header, claims and expiry.",
  title: "JWT Decoder — Decode a JSON Web Token Online",
  description:
    "A JWT is three chunks of Base64 separated by dots, which means anyone can read its contents — including you. Paste one here to see the header, every claim in the payload, and the timestamps turned into readable dates. Decoding does not verify the signature, so this tells you what a token says, not whether it can be trusted.",
  outputLabel: "Decoded token",
  example: { token: EXAMPLE },
  inputs: [
    { key: "token", label: "JWT", type: "textarea", tall: true, placeholder: "eyJhbGciOi..." },
  ],
  run(values: Values) {
    const token = str(values, "token");
    if (!token.trim()) return empty("Paste a JWT to decode it.");

    const { header, payload, signature } = splitJwt(token);

    const rows: Cell[][] = Object.entries(payload).map(([key, value]) => {
      const note = CLAIMS[key] || "";
      const stamp =
        TIME_CLAIMS.includes(key) && typeof value === "number" ? asUtc(value) : "";

      return [
        key,
        JSON.stringify(value) ?? "",
        { text: [note, stamp].filter(Boolean).join(" — "), muted: true },
      ];
    });

    return blocks(
      [
        { kind: "heading", text: "Header" },
        { kind: "code", text: pretty(header) },
        { kind: "heading", text: "Payload" },
        { kind: "code", text: pretty(payload) },
        { kind: "heading", text: "Claims" },
        { kind: "table", head: ["Claim", "Value", "What it means"], rows },
        { kind: "heading", text: "Signature" },
        { kind: "code", text: signature || "(none)" },
        {
          kind: "text",
          text: "Decoding a JWT does not verify its signature. Only the server holding the key can tell you whether this token is genuine.",
          muted: true,
        },
      ],
      pretty(payload),
    );
  },
  docs: [
    {
      heading: "What the three parts are",
      html: `<p>A JWT looks like <code>xxxxx.yyyyy.zzzzz</code>. Split on the dots and you get:</p>
      <ul class="list">
        <li><strong>Header</strong> — which algorithm signed the token, usually <code>HS256</code> or <code>RS256</code>.</li>
        <li><strong>Payload</strong> — the claims: who the user is, what they can do, when the token expires.</li>
        <li><strong>Signature</strong> — proof that the first two parts have not been altered, which only the holder of the key can check.</li>
      </ul>
      <p>The first two are Base64URL, not encryption. Anyone who has the token can read them, which is why a JWT should never carry a password or anything else secret.</p>`,
    },
    {
      heading: "The claims you will see most",
      html: `<ul class="list">
        <li><code>sub</code> — the subject, normally the user ID.</li>
        <li><code>exp</code> — expiry, as a Unix timestamp. After this moment the token should be rejected.</li>
        <li><code>iat</code> — when it was issued.</li>
        <li><code>nbf</code> — not before: the token is invalid until this time.</li>
        <li><code>iss</code> and <code>aud</code> — who issued it and who it was meant for. A correct server checks both.</li>
      </ul>
      <p>To see at a glance whether a token has already expired, use the <a href="/tools/jwt-expiry-checker">JWT expiry checker</a>.</p>`,
    },
    {
      heading: "Decoding is not verifying",
      html: `<p>This tool reads the token. It does not and cannot tell you whether the signature is valid, because that needs the secret or public key — and pasting your signing key into a website would be a genuinely bad idea. Verification belongs in your backend, using a library that checks the algorithm, the signature, <code>exp</code>, <code>iss</code> and <code>aud</code> together.</p>`,
    },
  ],
  faqs: [
    {
      q: "Is it safe to paste a real token here?",
      a: "The decoding happens in your browser and nothing is uploaded, so it does not leave your machine. That said, a token in your clipboard is a live credential — if it is a production token, treat it with the same care you would a password and prefer an already-expired one for poking around.",
    },
    {
      q: "Can I edit a JWT and re-sign it here?",
      a: "No. This tool only decodes. Creating or re-signing tokens needs the signing key, which belongs on your server and nowhere else.",
    },
    {
      q: "Why does my token have only two parts?",
      a: "Some tokens are unsigned, using the alg value none, and have an empty signature. A server should reject those unless it explicitly expects them.",
    },
  ],
};

export const jwtExpiryChecker: Tool = {
  slug: "jwt-expiry-checker",
  name: "JWT Expiry Checker",
  category: "Auth",
  summary: "Find out whether a token has expired, and how long it has left.",
  title: "JWT Expiry Checker — Is My Token Expired?",
  description:
    'Getting a 401 and wondering whether the token is the problem? Paste it here. You get a plain answer — valid or expired — along with when it was issued, when it expires and how much time is left, all converted from Unix timestamps into readable dates.',
  outputLabel: "Expiry status",
  example: { token: EXAMPLE },
  inputs: [{ key: "token", label: "JWT", type: "textarea", placeholder: "eyJhbGciOi..." }],
  run(values: Values) {
    const token = str(values, "token");
    if (!token.trim()) return empty("Paste a JWT to check its expiry.");

    const { payload } = splitJwt(token);
    const now = Math.floor(Date.now() / 1000);
    const rows: Cell[][] = [];

    if (typeof payload.iat === "number") {
      rows.push(["iat (issued)", asUtc(payload.iat), `${humanDelta(now - payload.iat)} ago`]);
    }

    if (typeof payload.nbf === "number") {
      const active = now >= payload.nbf;
      rows.push([
        "nbf (not before)",
        asUtc(payload.nbf),
        {
          text: active ? "active" : `not valid for another ${humanDelta(payload.nbf - now)}`,
          tone: active ? "ok" : "warn",
        },
      ]);
    }

    let verdict: { text: string; tone: "ok" | "warn" | "error" };

    if (typeof payload.exp !== "number") {
      verdict = { text: "This token has no exp claim, so it never expires.", tone: "warn" };
    } else {
      const remaining = payload.exp - now;

      rows.push([
        "exp (expires)",
        asUtc(payload.exp),
        {
          text: remaining > 0 ? `in ${humanDelta(remaining)}` : `${humanDelta(remaining)} ago`,
          tone: remaining > 0 ? "ok" : "error",
        },
      ]);

      verdict =
        remaining > 0
          ? { text: `Still valid — expires in ${humanDelta(remaining)}`, tone: "ok" }
          : { text: `Expired ${humanDelta(remaining)} ago`, tone: "error" };
    }

    return blocks([
      { kind: "heading", text: verdict.text, tone: verdict.tone },
      { kind: "table", head: ["Claim", "Time (UTC)", "Status"], rows },
      { kind: "text", text: `Checked against ${asUtc(now)}.`, muted: true },
    ]);
  },
  docs: [
    {
      heading: "Why a valid token can still be rejected",
      html: `<p>Expiry is only one of the reasons an API returns 401. If this tool says the token is still valid and the request is refused anyway, the usual causes are:</p>
      <ul class="list">
        <li>The signature does not match — wrong key, or the token was issued by a different environment.</li>
        <li>The <code>aud</code> or <code>iss</code> claim is not what the API expects.</li>
        <li>The token is fine but lacks the required <code>scope</code> for that endpoint, which some APIs report as 401 rather than 403.</li>
        <li>The server's clock is out of step with yours. A token that expires in seconds can be expired on arrival.</li>
      </ul>
      <p>Use the <a href="/tools/jwt-decoder">JWT decoder</a> to inspect those claims.</p>`,
    },
    {
      heading: "A note about clocks",
      html: `<p><code>exp</code> is a Unix timestamp in UTC, and it is compared against your own computer's clock here. If your machine's time is wrong, so is the answer. Most servers allow a small amount of leeway — typically 30 to 60 seconds — so a token that has just expired may still be accepted for a moment.</p>`,
    },
  ],
  faqs: [
    {
      q: "What should I do when a token has expired?",
      a: "Request a new one. If your API gave you a refresh token, exchange that for a fresh access token; otherwise log in again. Access tokens are meant to be short-lived, so expiry is normal rather than a fault.",
    },
    {
      q: "The token has no exp. Is that a problem?",
      a: "It means the token is valid until something else revokes it, which is risky: if it leaks, it stays useful forever. Short expiry times plus refresh tokens are the safer pattern.",
    },
  ],
};
