import { Tool, Values, empty, text } from "./types";
import { parseJson, pascalCase, singular, str } from "./shared";
import { mergeSamples } from "./json-to-typescript";
import { JSON_EXAMPLE } from "./json-formatter";

const isPythonName = (key: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);

function toPydantic(
  value: unknown,
  name: string,
  defs: string[],
  optional?: Set<string>,
): string {
  if (value === null) return "Optional[Any]";

  if (Array.isArray(value)) {
    if (!value.length) return "List[Any]";

    const sample = mergeSamples(value);
    if (sample) return `List[${toPydantic(sample.merged, singular(name), defs, sample.optional)}]`;

    return `List[${toPydantic(value[0], singular(name), defs)}]`;
  }

  if (typeof value === "object") {
    const className = pascalCase(name);

    const lines = Object.entries(value).map(([key, child]) => {
      let type = toPydantic(child, key, defs);
      const nullable = child === null || optional?.has(key);

      if (nullable && !type.startsWith("Optional[")) type = `Optional[${type}]`;

      if (isPythonName(key)) return `    ${key}: ${type}${nullable ? " = None" : ""}`;

      const safe = key.replace(/[^a-zA-Z0-9_]/g, "_");
      const alias = JSON.stringify(key);
      return `    ${safe}: ${type} = Field(${nullable ? "None" : "..."}, alias=${alias})`;
    });

    defs.push(`class ${className}(BaseModel):\n${lines.join("\n") || "    pass"}`);
    return className;
  }

  if (typeof value === "number") return Number.isInteger(value) ? "int" : "float";
  if (typeof value === "boolean") return "bool";
  return "str";
}

export const jsonToPydantic: Tool = {
  slug: "json-to-pydantic",
  name: "JSON → Pydantic",
  category: "JSON",
  summary: "Generate Pydantic models from a JSON sample for use in Python.",
  title: "JSON to Pydantic Model Generator (v2)",
  description:
    "Paste a JSON response and get Pydantic v2 models that describe it. Nested objects become their own classes, optional fields default to None, and any key that is not a valid Python name gets an alias so the model still matches the original JSON.",
  outputLabel: "Pydantic models",
  download: "models.py",
  example: { input: JSON_EXAMPLE, name: "User" },
  inputs: [
    { key: "input", label: "JSON", type: "textarea", tall: true, placeholder: JSON_EXAMPLE },
    { key: "name", label: "Main model name", type: "text", value: "Root", placeholder: "User" },
  ],
  run(values: Values) {
    const input = str(values, "input");
    if (!input.trim()) return empty("Paste a JSON sample to generate models.");

    const name = str(values, "name").trim() || "Root";
    const defs: string[] = [];
    const root = toPydantic(parseJson(input), name, defs);

    const body = defs.length ? defs.join("\n\n\n") : `${pascalCase(name)} = ${root}`;
    const needsField = body.includes("Field(");

    return text(`from typing import Any, List, Optional

from pydantic import BaseModel${needsField ? ", Field" : ""}


${body}`);
  },
  docs: [
    {
      heading: "Using the models",
      html: `<p>Install Pydantic with <code>pip install pydantic</code>, then validate a response in one line:</p>
      <pre><code>user = User.model_validate(response.json())</code></pre>
      <p>If the data does not match, Pydantic raises a <code>ValidationError</code> listing every field that is wrong — far more useful than a <code>KeyError</code> further down the file. After that, <code>user.email</code> is a real attribute your editor can autocomplete.</p>`,
    },
    {
      heading: "Field names that are not valid Python",
      html: `<p>JSON keys can contain hyphens and start with numbers; Python attribute names cannot. When that happens the attribute is renamed and given an <code>alias</code>, so the model still reads the original key. To let it also accept the Python name, add:</p>
      <pre><code>model_config = ConfigDict(populate_by_name=True)</code></pre>`,
    },
    {
      heading: "This is Pydantic v2",
      html: `<p>The output targets Pydantic v2, which is the current version. If you are on v1, <code>model_validate</code> is called <code>parse_obj</code> and <code>Optional[X] = None</code> still works the same way. Everything else in the generated file is identical.</p>`,
    },
  ],
  faqs: [
    {
      q: "Why is a field typed Optional[Any]?",
      a: "It was null in the sample, so there is nothing to infer from. Replace Any with the real type once you know it.",
    },
    {
      q: "Can I use these with FastAPI?",
      a: "Yes. FastAPI is built on Pydantic, so you can use a generated model directly as a request body or response_model.",
    },
  ],
};
