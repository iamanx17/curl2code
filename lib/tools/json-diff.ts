import { Block, Cell, Tool, Values, blocks, empty } from "./types";
import { parseJson, str } from "./shared";

type Change =
  | { type: "added"; path: string; to: unknown }
  | { type: "removed"; path: string; from: unknown }
  | { type: "changed"; path: string; from: unknown; to: unknown };

function compare(a: unknown, b: unknown, path: string, out: Change[]) {
  const isObject = (value: unknown) => value !== null && typeof value === "object";

  if (!isObject(a) || !isObject(b) || Array.isArray(a) !== Array.isArray(b)) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ type: "changed", path: path || "(root)", from: a, to: b });
    }
    return;
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;

  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const child = Array.isArray(a) ? `${path}[${key}]` : path ? `${path}.${key}` : key;

    if (!(key in left)) out.push({ type: "added", path: child, to: right[key] });
    else if (!(key in right)) out.push({ type: "removed", path: child, from: left[key] });
    else compare(left[key], right[key], child, out);
  }
}

export const jsonDiff: Tool = {
  slug: "json-diff",
  name: "JSON Diff",
  category: "JSON",
  summary: "Compare two JSON documents and see exactly which fields differ.",
  title: "JSON Diff — Compare Two JSON Documents",
  description:
    "Paste two JSON documents and get a list of every difference between them: fields that were added, fields that were removed, and values that changed. Nested objects and arrays are compared all the way down, so you do not have to read both payloads line by line.",
  outputLabel: "Differences",
  example: {
    left: '{"name":"Aman","age":25,"tags":["a","b"],"city":"Berlin"}',
    right: '{"name":"Aman","age":26,"tags":["a","c"],"country":"DE"}',
  },
  inputs: [
    { key: "left", label: "Original JSON", type: "textarea", tall: true, placeholder: '{"a":1}' },
    { key: "right", label: "Changed JSON", type: "textarea", tall: true, placeholder: '{"a":2}' },
  ],
  run(values: Values) {
    const left = str(values, "left");
    const right = str(values, "right");

    if (!left.trim() || !right.trim()) return empty("Paste JSON into both boxes to compare them.");

    const changes: Change[] = [];
    compare(parseJson(left, "the original JSON"), parseJson(right, "the changed JSON"), "", changes);

    if (!changes.length) {
      return blocks([{ kind: "heading", text: "No differences — the two documents match.", tone: "ok" }]);
    }

    const show = (value: unknown) => JSON.stringify(value) ?? "undefined";

    const rows: Cell[][] = changes.map((change) => {
      if (change.type === "added") {
        return [{ text: "added", tone: "ok" }, change.path, { text: show(change.to), tone: "ok" }];
      }
      if (change.type === "removed") {
        return [
          { text: "removed", tone: "error" },
          change.path,
          { text: show(change.from), tone: "error" },
        ];
      }
      return [
        { text: "changed", tone: "warn" },
        change.path,
        `${show(change.from)} → ${show(change.to)}`,
      ];
    });

    const summary: Block = {
      kind: "heading",
      text: `${changes.length} difference${changes.length === 1 ? "" : "s"}`,
    };

    return blocks([summary, { kind: "table", head: ["Change", "Path", "Value"], rows }]);
  },
  docs: [
    {
      heading: "How to read the result",
      html: `<p>Each row is one difference, identified by its path through the document. <code>profile.city</code> means the <code>city</code> field inside the <code>profile</code> object, and <code>tags[1]</code> means the second item of the <code>tags</code> array.</p>
      <ul class="list">
        <li><strong>added</strong> — the field exists in the changed document but not the original.</li>
        <li><strong>removed</strong> — the field was in the original and is now gone.</li>
        <li><strong>changed</strong> — the field exists in both but holds a different value.</li>
      </ul>`,
    },
    {
      heading: "A note about arrays",
      html: `<p>Arrays are compared by position, not by content. If you insert a new item at the start of a list, every following item counts as changed, because item 1 is now what item 0 used to be. That is usually the honest answer, but it is worth knowing before you panic at a long list of differences.</p>
      <p>Key order never matters — only values do. If two documents differ only in the order of their keys, this tool reports no differences.</p>`,
    },
  ],
  faqs: [
    {
      q: "What is this useful for?",
      a: "Working out what changed between two API responses, comparing a config file against a known-good copy, or checking that a migration produced the payload you expected.",
    },
    {
      q: "Do both documents have to have the same shape?",
      a: "No. If one has an object where the other has an array or a string, that is reported as a change at that path.",
    },
  ],
};
