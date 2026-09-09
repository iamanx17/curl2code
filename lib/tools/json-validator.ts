import { Tool, Values, blocks, empty } from "./types";
import { str } from "./shared";
import { JSON_EXAMPLE } from "./json-formatter";

type Stats = { objects: number; arrays: number; keys: number; values: number; depth: number };

function collect(node: unknown, depth: number, stats: Stats) {
  stats.depth = Math.max(stats.depth, depth);

  if (Array.isArray(node)) {
    stats.arrays++;
    node.forEach((item) => collect(item, depth + 1, stats));
  } else if (node && typeof node === "object") {
    stats.objects++;
    for (const [key, value] of Object.entries(node)) {
      stats.keys++;
      void key;
      collect(value, depth + 1, stats);
    }
  } else {
    stats.values++;
  }
}

export const jsonValidator: Tool = {
  slug: "json-validator",
  name: "JSON Validator",
  category: "JSON",
  summary: "Check whether your JSON is valid, and see the exact line where it breaks.",
  title: "JSON Validator — Find the Error in Your JSON",
  description:
    "Paste JSON and find out whether it is valid. If it is not, you get the line and column of the problem plus the surrounding text, so you can see the missing comma or bracket instead of guessing. If it is valid, you get a quick summary of what the document contains.",
  outputLabel: "Result",
  example: { input: '{"a":1,"b":[1,2,}' },
  inputs: [
    { key: "input", label: "JSON", type: "textarea", tall: true, placeholder: JSON_EXAMPLE },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input.trim()) return empty("Paste some JSON to check it.");

    try {
      const data = JSON.parse(input);
      const stats: Stats = { objects: 0, arrays: 0, keys: 0, values: 0, depth: 0 };
      collect(data, 1, stats);

      return blocks([
        { kind: "heading", text: "Valid JSON", tone: "ok" },
        {
          kind: "table",
          rows: [
            ["Root type", Array.isArray(data) ? "array" : typeof data],
            ["Objects", String(stats.objects)],
            ["Arrays", String(stats.arrays)],
            ["Keys", String(stats.keys)],
            ["Values", String(stats.values)],
            ["Max depth", String(stats.depth)],
            ["Size", `${input.length} characters`],
          ],
        },
      ]);
    } catch (error) {
      const message = (error as Error).message;
      const at = /position (\d+)/.exec(message);

      const detail = [];

      if (at) {
        const position = Number(at[1]);
        const before = input.slice(0, position);

        detail.push({
          kind: "text" as const,
          text: `Look at line ${before.split("\n").length}, column ${
            position - before.lastIndexOf("\n")
          }.`,
        });
        detail.push({
          kind: "code" as const,
          text: input.slice(Math.max(0, position - 60), position + 60),
        });
      }

      return blocks([
        { kind: "heading", text: "Invalid JSON", tone: "error" },
        {
          kind: "text",
          text: "Something is wrong with the structure. The usual causes are a missing comma, an extra trailing comma, or an unclosed bracket or quote.",
        },
        ...detail,
      ]);
    }
  },
  docs: [
    {
      heading: "The four mistakes that cause most errors",
      html: `<ul class="list">
        <li><strong>A trailing comma.</strong> <code>{"a": 1,}</code> is invalid JSON, even though JavaScript allows it.</li>
        <li><strong>Single quotes.</strong> JSON strings must use double quotes: <code>{"a": "b"}</code>, never <code>{'a': 'b'}</code>.</li>
        <li><strong>Unquoted keys.</strong> <code>{a: 1}</code> is a JavaScript object, not JSON. It must be <code>{"a": 1}</code>.</li>
        <li><strong>Comments.</strong> JSON has none. Remove any <code>//</code> or <code>/* */</code> lines.</li>
      </ul>`,
    },
    {
      heading: "Reading the error",
      html: `<p>The position we report is where the parser gave up, which is usually just <em>after</em> the real mistake. If it points at a closing brace, the missing comma is normally on the line above. Once the document parses, <a href="/tools/json-formatter">format it</a> to read it comfortably.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why does it say the error is at the end of my file?",
      a: "Because an unclosed bracket or quote is only detectable when the parser runs out of text. Check that every { and [ you opened has a matching close.",
    },
    {
      q: "Does valid JSON mean my API will accept it?",
      a: "No. It means the syntax is correct. The API can still reject it for having the wrong fields or types — that is schema validation, which is a separate question.",
    },
  ],
};
