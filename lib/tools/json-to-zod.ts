import { Tool, Values, empty, text } from "./types";
import { isSafeIdentifier, parseJson, pascalCase, singular, str } from "./shared";
import { mergeSamples } from "./json-to-typescript";
import { JSON_EXAMPLE } from "./json-formatter";

function toZod(value: unknown, name: string, optional?: Set<string>): string {
  if (value === null) return "z.null()";

  if (Array.isArray(value)) {
    if (!value.length) return "z.array(z.unknown())";

    const sample = mergeSamples(value);
    if (sample) return `z.array(${toZod(sample.merged, singular(name), sample.optional)})`;

    return `z.array(${toZod(value[0], singular(name))})`;
  }

  if (typeof value === "object") {
    const lines = Object.entries(value).map(([key, child]) => {
      const type = toZod(child, key) + (optional?.has(key) ? ".optional()" : "");
      const safe = isSafeIdentifier(key) ? key : JSON.stringify(key);
      return `  ${safe}: ${type},`;
    });

    return `z.object({\n${lines.join("\n")}\n})`;
  }

  if (typeof value === "number") return Number.isInteger(value) ? "z.number().int()" : "z.number()";
  if (typeof value === "boolean") return "z.boolean()";

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value as string)) return "z.string().email()";
  if (/^https?:\/\//.test(value as string)) return "z.string().url()";
  if (/^\d{4}-\d{2}-\d{2}T/.test(value as string)) return "z.string().datetime()";

  return "z.string()";
}

function reindent(schema: string) {
  let depth = 0;

  return schema
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("})")) depth--;
      const out = "  ".repeat(Math.max(0, depth)) + trimmed;
      if (trimmed.endsWith("{")) depth++;
      return out;
    })
    .join("\n");
}

export const jsonToZod: Tool = {
  slug: "json-to-zod",
  name: "JSON → Zod",
  category: "JSON",
  summary: "Build a Zod schema from a JSON sample, so the shape is checked at runtime.",
  title: "JSON to Zod Schema Generator",
  description:
    "Paste a JSON response and get a Zod schema for it. Unlike a TypeScript type, a Zod schema actually checks the data when your code runs, which is what you want at the edge of your app where an API response arrives. Emails, URLs and ISO dates are recognised and given the matching Zod validator.",
  outputLabel: "Zod schema",
  download: "schema.ts",
  example: { input: JSON_EXAMPLE, name: "User" },
  inputs: [
    { key: "input", label: "JSON", type: "textarea", tall: true, placeholder: JSON_EXAMPLE },
    { key: "name", label: "Schema name", type: "text", value: "Root", placeholder: "User" },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input.trim()) return empty("Paste a JSON sample to generate a schema.");

    const name = pascalCase(str(values, "name").trim() || "Root");
    const schema = reindent(toZod(parseJson(input), name));

    return text(`import { z } from "zod";

export const ${name}Schema = ${schema};

export type ${name} = z.infer<typeof ${name}Schema>;`);
  },
  docs: [
    {
      heading: "Why a schema instead of a type",
      html: `<p>A TypeScript type disappears when your code is compiled — it cannot notice that an API returned a number where you expected a string. A Zod schema is real code that runs, so you can check the data at the boundary and fail with a clear message instead of a confusing crash three functions later.</p>
      <p>Use it like this:</p>
      <pre><code>const data = UserSchema.parse(await response.json());</code></pre>
      <p><code>parse</code> throws if the data does not match. <code>safeParse</code> returns a result object instead, if you would rather handle it yourself.</p>`,
    },
    {
      heading: "You get the type for free",
      html: `<p>The last line of the output, <code>z.infer&lt;typeof Schema&gt;</code>, derives a TypeScript type from the schema. Define the shape once and both the runtime check and the compile-time type stay in sync. If you only want the type, use the <a href="/tools/json-to-typescript">JSON to TypeScript</a> tool instead.</p>`,
    },
    {
      heading: "Tighten it by hand",
      html: `<p>The generated guesses are deliberately loose. A field that is always one of a few known strings is better written as <code>z.enum(["draft", "sent"])</code>, and a numeric ID is often <code>z.number().int().positive()</code>. Add <code>zod</code> to your project with <code>npm install zod</code>.</p>`,
    },
  ],
  faqs: [
    {
      q: "Which version of Zod is this for?",
      a: "Zod 3 and later. The generated syntax is the standard z.object / z.array style that has not changed across recent versions.",
    },
    {
      q: "Why is my optional field not marked optional?",
      a: "Optional fields are detected by comparing objects inside an array. If you paste a single object there is nothing to compare it against, so add .optional() yourself to any field the API can omit.",
    },
  ],
};
