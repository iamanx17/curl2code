import { Cell, Tool, Values, blocks } from "./types";
import { str } from "./shared";
import { HTTP_STATUS, statusTone } from "../http-status";

export const httpStatusCodes: Tool = {
  slug: "http-status-codes",
  name: "HTTP Status Codes",
  category: "API",
  summary: "Look up what an HTTP status code means, by number or by keyword.",
  title: "HTTP Status Codes — Full List With Plain Explanations",
  description:
    "Type a status code to find out what it means and, more usefully, what usually causes it. You can also search by keyword — try 'timeout' or 'rate' — or type 4xx to list a whole class at once. Leave the box empty to browse every code.",
  outputLabel: "Matches",
  example: { query: "429" },
  inputs: [
    {
      key: "query",
      label: "Code or keyword",
      type: "text",
      placeholder: "404, 5xx, timeout, rate…",
    },
  ],
  run(values: Values) {
    const query = str(values, "query").trim().toLowerCase();
    let entries = Object.entries(HTTP_STATUS);

    if (query) {
      if (/^\dxx$/.test(query)) {
        entries = entries.filter(([code]) => code.startsWith(query[0]));
      } else {
        entries = entries.filter(
          ([code, [name, note]]) =>
            code.includes(query) ||
            name.toLowerCase().includes(query) ||
            note.toLowerCase().includes(query),
        );
      }
    }

    if (!entries.length) {
      return blocks([
        { kind: "heading", text: "No match", tone: "warn" },
        { kind: "text", text: "Try a number, a class like 4xx, or a word such as timeout." },
      ]);
    }

    const rows: Cell[][] = entries.map(([code, [name, note]]) => [
      { text: code, tone: statusTone(Number(code)) },
      name,
      { text: note, muted: true },
    ]);

    return blocks([{ kind: "table", head: ["Code", "Name", "What it means"], rows }]);
  },
  docs: [
    {
      heading: "The five classes",
      html: `<p>The first digit tells you who has a problem, which is usually all you need:</p>
      <ul class="list">
        <li><strong>1xx</strong> — informational. You will rarely see these.</li>
        <li><strong>2xx</strong> — it worked.</li>
        <li><strong>3xx</strong> — look somewhere else; a redirect.</li>
        <li><strong>4xx</strong> — <em>your</em> request was wrong. Fix the request.</li>
        <li><strong>5xx</strong> — the <em>server</em> failed. Retrying may help; changing your request will not.</li>
      </ul>`,
    },
    {
      heading: "The ones that confuse people",
      html: `<ul class="list">
        <li><strong>401 vs 403.</strong> 401 means the server does not know who you are — the credentials are missing, wrong or expired. 403 means it knows exactly who you are and you are not allowed. Check your token with the <a href="/tools/jwt-expiry-checker">expiry checker</a> before assuming a permissions problem.</li>
        <li><strong>400 vs 422.</strong> 400 means the server could not even parse what you sent, usually broken JSON. 422 means it parsed fine but a value was unacceptable — a missing field or a bad email. If you get 400, run the body through the <a href="/tools/json-validator">JSON validator</a>.</li>
        <li><strong>404 on a URL you know exists.</strong> Often authentication: some APIs return 404 instead of 403 so they do not reveal that a resource exists.</li>
        <li><strong>502 vs 503 vs 504.</strong> All mean "not my code": upstream returned garbage, is down, or was too slow, respectively.</li>
      </ul>`,
    },
    {
      heading: "429 and retrying properly",
      html: `<p>A 429 means you have been rate limited. The response normally carries a <code>Retry-After</code> header saying how long to wait — respect it rather than retrying immediately, which usually extends the block. For 5xx errors, retry with exponential backoff and a limit, and never retry a non-idempotent request such as a payment without a way to detect duplicates.</p>`,
    },
  ],
  faqs: [
    {
      q: "Which codes should my own API return?",
      a: "200 for success, 201 when you created something, 204 when there is nothing to return, 400 or 422 for bad input, 401 when unauthenticated, 403 when unauthorised, 404 when missing, and 500 when your code broke. That covers nearly everything.",
    },
    {
      q: "Is 418 real?",
      a: "It comes from an April Fools' RFC about coffee pots, but plenty of servers implement it and it is genuinely registered. Do not build anything on it.",
    },
  ],
};
