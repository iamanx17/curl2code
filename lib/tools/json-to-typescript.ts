import { Tool, Values, empty, text } from "./types";
import { isSafeIdentifier, parseJson, pascalCase, singular, str } from "./shared";
import { JSON_EXAMPLE } from "./json-formatter";

/**
 * Looks at every object in an array so a key that is missing from some of them
 * can be marked optional instead of pretending the first item is the whole truth.
 */
export function mergeSamples(items: unknown[]) {
  const objects = items.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  );

  if (!objects.length) return null;

  const merged: Record<string, unknown> = {};
  const counts: Record<string, number> = {};

  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      counts[key] = (counts[key] || 0) + 1;
      if (!(key in merged) || merged[key] === null) merged[key] = value;
    }
  }

  const optional = new Set(Object.keys(counts).filter((key) => counts[key] < objects.length));

  return { merged, optional };
}

function toType(value: unknown, name: string, defs: string[], optional?: Set<string>): string {
  if (value === null) return "null";

  if (Array.isArray(value)) {
    if (!value.length) return "unknown[]";

    const sample = mergeSamples(value);
    if (sample) return toType(sample.merged, singular(name), defs, sample.optional) + "[]";

    const types = [...new Set(value.map((item) => toType(item, singular(name), defs)))];
    return (types.length === 1 ? types[0] : `(${types.join(" | ")})`) + "[]";
  }

  if (typeof value === "object") {
    const typeName = pascalCase(name);

    const lines = Object.entries(value).map(([key, child]) => {
      const mark = optional?.has(key) ? "?" : "";
      const safe = isSafeIdentifier(key) ? key : JSON.stringify(key);
      return `  ${safe}${mark}: ${toType(child, key, defs)};`;
    });

    defs.push(`export interface ${typeName} {\n${lines.join("\n")}\n}`);
    return typeName;
  }

  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

export const jsonToTypescript: Tool = {
  slug: "json-to-typescript",
  name: "JSON → TypeScript",
  category: "JSON",
  summary: "Turn a JSON response into ready-to-paste TypeScript interfaces.",
  title: "JSON to TypeScript — Generate Interfaces From JSON",
  description:
    "Paste a real API response and get the TypeScript interfaces that describe it. Nested objects become their own named interfaces, arrays are typed from their contents, and a field that is missing from some items in an array is marked optional with a question mark.",
  outputLabel: "TypeScript",
  download: "types.ts",
  example: { input: JSON_EXAMPLE, name: "User" },
  inputs: [
    { key: "input", label: "JSON", type: "textarea", tall: true, placeholder: JSON_EXAMPLE },
    {
      key: "name",
      label: "Name for the main type",
      type: "text",
      value: "Root",
      placeholder: "User",
    },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input.trim()) return empty("Paste a JSON sample to generate types.");

    const name = str(values, "name").trim() || "Root";
    const defs: string[] = [];
    const root = toType(parseJson(input), name, defs);

    if (!defs.length) return text(`export type ${pascalCase(name)} = ${root};`);

    if (root.endsWith("[]")) defs.push(`export type ${pascalCase(name)}List = ${root};`);

    return text(defs.join("\n\n"));
  },
  docs: [
    {
      heading: "How the types are worked out",
      html: `<ul class="list">
        <li>A string becomes <code>string</code>, a number <code>number</code>, true or false <code>boolean</code>.</li>
        <li>An object becomes its own <code>interface</code>, named after the field that held it.</li>
        <li>An array is typed from its items — <code>string[]</code>, or an interface followed by <code>[]</code>.</li>
        <li><code>null</code> becomes <code>null</code>, because that is all a single sample can tell us.</li>
      </ul>`,
    },
    {
      heading: "Give it more than one item",
      html: `<p>If your JSON contains an array of objects, paste the whole array rather than a single item. Every object is inspected, and any key that does not appear in all of them is marked optional. One sample cannot show you which fields the API sometimes omits; ten can.</p>`,
    },
    {
      heading: "What to check afterwards",
      html: `<p>Generated types describe the sample you pasted, not the API's contract. A field that happened to be <code>null</code> in your sample will be typed <code>null</code>, and a field the API can omit will look required unless the sample proves otherwise. Read the output once before committing it. If you want types that also check the data at runtime, generate a <a href="/tools/json-to-zod">Zod schema</a> instead.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why is one of my fields typed null?",
      a: "Because it was null in the sample, and a single null tells us nothing about the real type. Change it to a realistic value and regenerate, then widen the type by hand — for example string | null.",
    },
    {
      q: "Can I use interfaces or types?",
      a: "The output uses interfaces, which is the common choice for describing API shapes. Renaming interface to type works without any other change.",
    },
  ],
};
