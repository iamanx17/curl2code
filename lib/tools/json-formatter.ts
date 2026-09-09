import { Tool, Values, empty, text } from "./types";
import { parseJson, pretty, str, bool } from "./shared";

export const JSON_EXAMPLE = pretty({
  id: 42,
  name: "Aman",
  email: "aman@example.com",
  active: true,
  tags: ["api", "tools"],
  profile: { city: "Berlin", zip: null },
});

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }

  return value;
}

export const jsonFormatter: Tool = {
  slug: "json-formatter",
  name: "JSON Formatter",
  category: "JSON",
  summary: "Paste messy JSON and get it back neatly indented, or squashed onto one line.",
  title: "JSON Formatter and Beautifier — Free Online Tool",
  description:
    "API responses usually arrive as one long unreadable line. Paste it here and get it back properly indented so you can actually read it, or minify it to make it as small as possible. You can also sort the keys alphabetically, which is the trick that makes two similar payloads easy to compare.",
  outputLabel: "Formatted JSON",
  download: "formatted.json",
  example: { input: '{"b":2,"a":[1,2,{"c":3}],"d":{"e":"f"}}', indent: "2", sort: false },
  inputs: [
    { key: "input", label: "JSON", type: "textarea", tall: true, placeholder: '{"hello":"world"}' },
    {
      key: "indent",
      label: "Indent",
      type: "select",
      options: [
        { value: "2", label: "2 spaces" },
        { value: "4", label: "4 spaces" },
        { value: "tab", label: "Tab" },
        { value: "minify", label: "Minify (one line)" },
      ],
    },
    { key: "sort", label: "Sort keys alphabetically", type: "checkbox" },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input.trim()) return empty("Paste some JSON to format it.");

    const data = bool(values, "sort") ? sortDeep(parseJson(input)) : parseJson(input);
    const indent = str(values, "indent");

    if (indent === "minify") return text(JSON.stringify(data));

    return text(JSON.stringify(data, null, indent === "tab" ? "\t" : Number(indent) || 2));
  },
  docs: [
    {
      heading: "How to use it",
      html: `<ol class="list">
        <li>Copy the JSON you want to read — from a terminal, a log, a ticket, anywhere.</li>
        <li>Paste it into the box. The formatted version appears immediately.</li>
        <li>Press <strong>Copy output</strong>, or <strong>Download</strong> to save it as a <code>.json</code> file.</li>
      </ol>
      <p>If the JSON is broken you get a message saying so. The <a href="/tools/json-validator">JSON validator</a> will tell you exactly which line and column to look at.</p>`,
    },
    {
      heading: "When sorting keys helps",
      html: `<p>Two API responses can contain identical data but list their keys in a different order, which makes them look completely different side by side. Sort both, and the only remaining differences are real ones. It is the fastest way to prepare two payloads for the <a href="/tools/json-diff">JSON diff</a>.</p>`,
    },
    {
      heading: "Things worth knowing",
      html: `<ul class="list">
        <li>Numbers are re-read by JavaScript, so an integer above 2^53 loses precision. Keep IDs that large as strings.</li>
        <li>Duplicate keys are not preserved — the last one wins, which is what most parsers do too.</li>
        <li>Formatting happens on your machine. Nothing is uploaded, so production payloads are safe to paste.</li>
      </ul>`,
    },
  ],
  faqs: [
    {
      q: "What is the difference between formatting and minifying?",
      a: "Formatting adds line breaks and indentation so a human can read it. Minifying removes every optional space so a machine can transfer it in fewer bytes. The data is identical either way.",
    },
    {
      q: "Is there a size limit?",
      a: "Only what your browser can hold. A few megabytes is fine. Very large documents may take a moment to render because the formatting happens in the page.",
    },
    {
      q: "Is my JSON sent to a server?",
      a: "No. The formatter is JavaScript running in your own tab. You can open your browser's network panel and watch — nothing leaves the page.",
    },
  ],
};
