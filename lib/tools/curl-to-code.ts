import { Tool, ToolInput, Values, empty, text } from "./types";
import { str } from "./shared";
import { LANGUAGES } from "../curl/generate";
import { parseCurl } from "../curl/parse";
import { CURL_DOCS, CURL_FAQS, LANGUAGE_CONTENT } from "./curl-content";

const EXAMPLE = `curl 'https://api.example.com/v1/users?limit=20' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '{"name":"Ada Lovelace","email":"ada@example.com","admin":false}'`;

const plain = (html: string) => html.replace(/<[^>]+>/g, "");

function inputs(defaultLang: string): ToolInput[] {
  return [
    {
      key: "lang",
      label: "Target language",
      type: "select",
      value: defaultLang,
      options: LANGUAGES.map((language) => ({ value: language.id, label: language.label })),
    },
    {
      key: "curl",
      label: "cURL command",
      type: "textarea",
      tall: true,
      placeholder: "curl https://api.example.com/v1/users -H 'Authorization: Bearer ...'",
      hint: "Parsed in your browser. Nothing you paste — including tokens — is uploaded.",
    },
  ];
}

function run(values: Values) {
  const command = str(values, "curl");
  if (!command.trim()) return empty("Paste a cURL command to see the generated code.");

  const language = LANGUAGES.find((item) => item.id === str(values, "lang")) || LANGUAGES[0];
  const request = parseCurl(command);

  return text(language.generate(request), request.warnings);
}

const download = (values: Values) => {
  const language = LANGUAGES.find((item) => item.id === str(values, "lang")) || LANGUAGES[0];
  return `request.${language.ext}`;
};

export const curlToCode: Tool = {
  slug: "curl-to-code",
  name: "cURL → Code Converter",
  category: "cURL",
  summary: "Paste a cURL command and get the same request as working code in nine languages.",
  title: "cURL to Code Converter — 9 Languages",
  description:
    "Every API's documentation shows you a cURL command, but your project is not written in cURL. Paste the command here and get the same request as runnable code in JavaScript, Python, Go, Java, PHP, C#, Ruby, Node.js or Axios. Headers, query parameters, JSON and form bodies, basic and bearer auth and file uploads are all converted for you.",
  outputLabel: "Generated code",
  example: { curl: EXAMPLE, lang: "python" },
  inputs: inputs("javascript"),
  run,
  download,
  docs: CURL_DOCS,
  faqs: CURL_FAQS,
};

/**
 * One page per target language. They all host the same converter — the only
 * difference is which language is selected and what the page explains.
 */
export const curlLanguageTools: Tool[] = LANGUAGE_CONTENT.map((content) => ({
  slug: content.slug,
  name: `cURL → ${content.name}`,
  category: "cURL",
  summary: content.summary,
  title: content.title,
  description: plain(content.intro),
  outputLabel: "Generated code",
  example: { curl: EXAMPLE, lang: content.lang },
  inputs: inputs(content.lang),
  run,
  download,
  docs: [
    { heading: `Running the generated ${content.name} code`, html: content.notes },
    {
      heading: "What gets converted",
      html: `<p>The parser reads the method, URL and query string, every <code>-H</code> header, cookies and user agent, <code>-u</code> and <code>--oauth2-bearer</code> credentials, all the <code>-d</code> body variants including <code>--data-urlencode</code> and <code>--json</code>, <code>-G</code>, and multipart <code>-F</code> uploads. Flags that only affect the terminal, such as <code>-s</code> or <code>-v</code>, are ignored. Anything with no code equivalent is listed above the output rather than dropped silently.</p>
      <p>The full option table and worked examples are on the <a href="/tools/curl-to-code">main converter page</a>, which offers every language in one place.</p>`,
    },
  ],
}));
