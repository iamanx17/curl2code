import { Cell, Tool, Values, blocks, empty, text } from "./types";
import { bool, str } from "./shared";

function formatUuid(bytes: Uint8Array) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

/** RFC 9562 v7: 48 bits of Unix time first, so new ids sort by creation order. */
function uuidV7() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const millis = Date.now();

  bytes[0] = (millis / 2 ** 40) & 0xff;
  bytes[1] = (millis / 2 ** 32) & 0xff;
  bytes[2] = (millis / 2 ** 24) & 0xff;
  bytes[3] = (millis / 2 ** 16) & 0xff;
  bytes[4] = (millis / 2 ** 8) & 0xff;
  bytes[5] = millis & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return formatUuid(bytes);
}

export const uuidGenerator: Tool = {
  slug: "uuid-generator",
  name: "UUID Generator",
  category: "Utilities",
  summary: "Generate random or time-ordered UUIDs, one or hundreds at a time.",
  title: "UUID Generator — v4 and v7 UUIDs, Bulk",
  description:
    "A UUID is a 128-bit identifier you can create without asking a central server, which makes it useful for database keys, request IDs and file names. Choose v4 for pure randomness or v7 if you want ids that sort by the time they were created, then generate as many as you need.",
  outputLabel: "UUIDs",
  inputs: [
    {
      key: "version",
      label: "Version",
      type: "select",
      options: [
        { value: "4", label: "v4 — random" },
        { value: "7", label: "v7 — time-ordered" },
        { value: "nil", label: "Nil UUID — all zeros" },
      ],
    },
    { key: "count", label: "How many", type: "text", value: "10", hint: "Between 1 and 500." },
    { key: "upper", label: "Uppercase", type: "checkbox" },
    { key: "nodash", label: "Remove hyphens", type: "checkbox" },
  ],
  run(values: Values) {
    const count = Math.min(Math.max(parseInt(str(values, "count"), 10) || 1, 1), 500);
    const version = str(values, "version") || "4";

    const list = Array.from({ length: count }, () => {
      let id =
        version === "nil"
          ? "00000000-0000-0000-0000-000000000000"
          : version === "7"
            ? uuidV7()
            : crypto.randomUUID();

      if (bool(values, "nodash")) id = id.replace(/-/g, "");
      if (bool(values, "upper")) id = id.toUpperCase();

      return id;
    });

    return text(list.join("\n"));
  },
  docs: [
    {
      heading: "v4 or v7?",
      html: `<p><strong>v4</strong> is 122 random bits. Two of them will never collide in practice, and they reveal nothing about when they were made. It is the safe default and what <code>crypto.randomUUID()</code> gives you.</p>
      <p><strong>v7</strong> starts with the current time in milliseconds, so ids created later sort after earlier ones. That matters if you use UUIDs as database primary keys: random keys scatter writes across the whole index, while time-ordered keys append neatly and keep inserts fast. The cost is that a v7 id tells anyone who sees it roughly when it was created.</p>`,
    },
    {
      heading: "The nil UUID",
      html: `<p>All zeros. It is a valid UUID and useful as a deliberate placeholder — "no owner yet" — in a column that cannot be null. Do not use it as a real identifier.</p>`,
    },
    {
      heading: "Are these safe to rely on?",
      html: `<p>They come from <code>crypto.getRandomValues</code>, your browser's cryptographic random source, not <code>Math.random</code>. They are generated locally and never sent anywhere, so no one else has ever seen them.</p>
      <p>That said, a UUID is an identifier, not a secret. Anyone who receives one can pass it on, so do not treat "knows the UUID" as proof of anything. For a password or a token, use a <a href="/tools/hmac-generator">signed value</a> or a purpose-built secret instead.</p>`,
    },
  ],
  faqs: [
    {
      q: "Can two UUIDs ever be the same?",
      a: "Mathematically yes, practically no. You would need to generate billions per second for many years before a collision became likely.",
    },
    {
      q: "Should I store them as text or binary?",
      a: "If your database has a native UUID type, use it — 16 bytes instead of 36 characters, and faster comparisons. PostgreSQL has uuid; MySQL is usually BINARY(16).",
    },
  ],
};

export const regexTester: Tool = {
  slug: "regex-tester",
  name: "Regex Tester",
  category: "Utilities",
  summary: "Test a regular expression against sample text and see every match and group.",
  title: "Regex Tester — Test JavaScript Regular Expressions",
  description:
    "Write a pattern, paste some text, and see every match with its position and capture groups as you type. It uses your browser's own regex engine, so the results are exactly what your JavaScript will do. Named groups are shown by name, and you can preview a replacement.",
  outputLabel: "Matches",
  example: {
    pattern: "(\\w+)@(\\w+\\.\\w+)",
    flags: "g",
    text: "Mail ada@example.com or grace@example.org for access.",
    replace: "",
  },
  inputs: [
    { key: "pattern", label: "Pattern", type: "text", placeholder: "(\\d{4})-(\\d{2})-(\\d{2})" },
    {
      key: "flags",
      label: "Flags",
      type: "text",
      value: "g",
      placeholder: "gim",
      hint: "g all matches · i ignore case · m ^ and $ per line · s dot matches newline",
    },
    { key: "text", label: "Test text", type: "textarea", tall: true, placeholder: "Text to search…" },
    {
      key: "replace",
      label: "Replacement, to preview a replace (optional)",
      type: "text",
      placeholder: "$1 at $2",
    },
  ],
  run(values: Values) {
    const pattern = str(values, "pattern");
    const subject = str(values, "text");

    if (!pattern) return empty("Enter a pattern to start matching.");
    if (!subject) return empty("Add some test text below the pattern.");

    const flags = str(values, "flags");
    let regex: RegExp;

    try {
      regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
    } catch (error) {
      throw new Error(`That pattern is not valid: ${(error as Error).message}`);
    }

    const matches = [...subject.matchAll(regex)];

    if (!matches.length) {
      return blocks([
        { kind: "heading", text: "No matches", tone: "warn" },
        {
          kind: "text",
          text: "The pattern is valid but nothing in the text matched it. Check for a missing i flag if the case differs.",
          muted: true,
        },
      ]);
    }

    const rows: Cell[][] = matches.map((match, index) => {
      const groups = match.slice(1).map((value, position) => {
        const name = match.groups
          ? Object.keys(match.groups).find((key) => match.groups![key] === value)
          : null;

        return `${name || position + 1}: ${value === undefined ? "—" : value}`;
      });

      return [
        String(index + 1),
        String(match.index),
        match[0],
        groups.length ? groups.join("\n") : { text: "none", muted: true },
      ];
    });

    const out: Cell[][] = rows;
    const replacement = str(values, "replace");

    return blocks([
      {
        kind: "heading",
        text: `${matches.length} match${matches.length === 1 ? "" : "es"}`,
        tone: "ok",
      },
      { kind: "table", head: ["#", "At", "Match", "Groups"], rows: out },
      ...(replacement
        ? ([
            { kind: "heading", text: "After replacing" },
            { kind: "code", text: subject.replace(regex, replacement) },
          ] as const)
        : []),
    ]);
  },
  docs: [
    {
      heading: "The pieces you need most",
      html: `<ul class="list">
        <li><code>\\d</code> a digit, <code>\\w</code> a letter, digit or underscore, <code>\\s</code> whitespace. Capitalise to invert: <code>\\D</code> is any non-digit.</li>
        <li><code>+</code> one or more, <code>*</code> zero or more, <code>?</code> optional, <code>{2,4}</code> between two and four.</li>
        <li><code>[abc]</code> any one of these, <code>[^abc]</code> anything but these, <code>[a-z]</code> a range.</li>
        <li><code>(…)</code> captures what it matches so you can reuse it. <code>(?:…)</code> groups without capturing.</li>
        <li><code>^</code> start, <code>$</code> end, <code>\\b</code> a word boundary.</li>
      </ul>
      <p>Name a group with <code>(?&lt;year&gt;\\d{4})</code> and it appears by name in the results, which is far easier to read later than <code>$1</code>.</p>`,
    },
    {
      heading: "Using the replacement box",
      html: `<p>Type <code>$1</code> to insert the first capture group, <code>$2</code> the second, or <code>$&lt;name&gt;</code> for a named one. The preview shows the result of <code>text.replace(pattern, replacement)</code> — the same call your code would make.</p>`,
    },
    {
      heading: "This is the JavaScript flavour",
      html: `<p>Patterns run in your browser's engine, so what you see is exactly what <code>String.prototype.matchAll</code> will do. It differs from PCRE and Python's <code>re</code>: there are no atomic groups and no recursion, and lookbehind needs a recent browser.</p>
      <p>One warning worth taking seriously: nested quantifiers such as <code>(a+)+</code> can backtrack catastrophically and hang on a long input. If this page freezes, that is the cause — and the same pattern would freeze your server.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why does my pattern only find the first match?",
      a: "You need the g flag. It is added automatically here so you can see everything, but remember it in your own code.",
    },
    {
      q: "Do I need to escape the slashes?",
      a: "No. Enter the pattern itself, without the surrounding /…/ that JavaScript literals use. Put the flags in the flags box.",
    },
    {
      q: "Can I use this to validate email addresses?",
      a: "You can, but a short pattern will reject valid addresses and accept invalid ones. Check for a single @ with something either side, then send a confirmation email — that is the only real test.",
    },
  ],
};

const UNITS: [string, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

function relative(millis: number) {
  const seconds = Math.round((millis - Date.now()) / 1000);
  const total = Math.abs(seconds);

  for (const [unit, size] of UNITS) {
    if (total >= size || unit === "second") {
      const amount = Math.round(total / size);
      const plural = amount === 1 ? "" : "s";

      return seconds < 0 ? `${amount} ${unit}${plural} ago` : `in ${amount} ${unit}${plural}`;
    }
  }

  return "now";
}

function parseTimestamp(input: string) {
  const value = input.trim();

  if (!value || value.toLowerCase() === "now") return Date.now();

  if (/^-?\d+$/.test(value)) {
    const number = Number(value);

    // 10 digits is seconds, 13 milliseconds, 16 microseconds
    if (Math.abs(number) >= 1e15) return Math.round(number / 1000);
    if (Math.abs(number) >= 1e11) return number;

    return number * 1000;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new Error(
      `Could not read "${value}". Try a Unix timestamp such as 1735689600, an ISO date such as 2025-01-01T00:00:00Z, or the word now.`,
    );
  }

  return parsed;
}

export const timestampConverter: Tool = {
  slug: "timestamp-converter",
  name: "Unix Timestamp Converter",
  category: "Utilities",
  summary: "Convert a Unix timestamp into a readable date, or a date into a timestamp.",
  title: "Unix Timestamp Converter — Epoch to Date and Back",
  description:
    "Paste a Unix timestamp to find out what date it is, or paste a date to get the timestamp. Seconds, milliseconds and microseconds are detected from the number of digits, and you get UTC, your local time and how long ago it was, all at once.",
  outputLabel: "Conversions",
  example: { input: "1735689600" },
  inputs: [
    {
      key: "input",
      label: "Timestamp or date",
      type: "text",
      placeholder: "1735689600, 2025-01-01T00:00:00Z, or now",
      hint: "Leave it empty or type now for the current time.",
    },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input.trim()) return empty('Enter a timestamp, a date, or the word "now".');

    const millis = parseTimestamp(input);
    const date = new Date(millis);

    if (Number.isNaN(date.getTime())) {
      throw new Error("That value is outside the range of dates a browser can represent.");
    }

    const rows: Cell[][] = [
      ["Unix seconds", String(Math.floor(millis / 1000))],
      ["Unix milliseconds", String(millis)],
      ["ISO 8601 (UTC)", date.toISOString()],
      ["UTC", date.toUTCString()],
      ["Your local time", date.toString()],
      ["Your time zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
      ["Relative", relative(millis)],
      ["Day of week", date.toLocaleDateString(undefined, { weekday: "long" })],
    ];

    return blocks([{ kind: "table", rows }], String(Math.floor(millis / 1000)));
  },
  docs: [
    {
      heading: "Seconds, milliseconds or microseconds?",
      html: `<p>This is where the confusion always starts. Unix time is defined in <strong>seconds</strong> since 1 January 1970, and a current timestamp has 10 digits. But JavaScript's <code>Date.now()</code> returns <strong>milliseconds</strong> (13 digits), and some databases store <strong>microseconds</strong> (16 digits).</p>
      <p>Getting it wrong does not raise an error — it silently gives you a date in 1970 or in the far future. This tool guesses the unit from the digit count and shows both seconds and milliseconds so you can see which your system means.</p>`,
    },
    {
      heading: "Timestamps have no time zone",
      html: `<p>A Unix timestamp is always UTC. It is a single moment in time, and it is the same number everywhere in the world — the time zone only appears when you format it for a human. That is exactly why storing timestamps is safer than storing local date strings.</p>
      <p>An ISO string ending in <code>Z</code> is UTC. One with no offset at all is ambiguous and different parsers will read it differently, so always include the offset.</p>`,
    },
    {
      heading: "The year 2038",
      html: `<p>A signed 32-bit integer runs out on 19 January 2038. Any system still storing timestamps in one will overflow into negative numbers and land in 1901. Modern languages use 64-bit values, but it is worth checking older databases and embedded systems.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why does the date show as 1970?",
      a: "Your value is almost certainly in milliseconds but was read as seconds, or it is a very small number. A current timestamp in seconds has 10 digits.",
    },
    {
      q: "How do I get a timestamp for right now?",
      a: 'Type "now", or leave the box empty. In code: Math.floor(Date.now() / 1000) in JavaScript, time.time() in Python, date +%s in a shell.',
    },
  ],
};
