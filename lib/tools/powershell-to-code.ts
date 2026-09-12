import { curlToCode } from "./curl-to-code";
import { parsePowerShell } from "../curl/powershell";
import { LANGUAGES } from "../curl/generate";
import { str } from "./shared";
import { empty, text, type Tool } from "./types";

export const powershellToCode: Tool = {
  ...curlToCode,
  slug: "powershell-to-code",
  name: "PowerShell → Code",
  title: "PowerShell to Code Converter — 10 Languages",
  summary: "Convert browser PowerShell requests into code in ten languages.",
  description: "Paste a browser-generated Invoke-WebRequest or PowerShell cURL command. Convert its headers, cookies, authentication and body using the same ten languages as the cURL converter. Everything is parsed locally in your browser.",
  inputs: curlToCode.inputs.map(input => input.key === "curl" ? { ...input, label: "PowerShell command", placeholder: "curl.exe 'https://api.example.com/users' `\n  -H 'Accept: application/json'" } : input.key === "lang" ? { ...input, value: "powershell" } : input),
  example: { lang: "powershell", curl: "curl 'https://api.example.com/users?limit=20' `\n  -H 'Content-Type: application/json' `\n  -H 'Authorization: Bearer YOUR_TOKEN' `\n  --data-raw '{\"name\":\"Ada\"}'" },
  run(values) {
    const command = str(values, "curl");
    if (!command.trim()) return empty("Paste a PowerShell command to see the generated code.");
    const language = LANGUAGES.find(item => item.id === str(values, "lang")) || LANGUAGES[0];
    const request = parsePowerShell(command);
    return text(language.generate(request), request.warnings);
  },
  docs: [{ heading: "Copy from DevTools", html: "<p>In Chrome or Edge, open Network, right-click a request and choose <strong>Copy as PowerShell</strong> (or <strong>Copy as cURL (PowerShell)</strong>, depending on your browser). Paste the complete command here. Single-quoted literals, doubled single quotes, double-quoted strings and backtick escapes are supported.</p><p>On Windows PowerShell 5.1, <code>curl</code> is an alias for <code>Invoke-WebRequest</code>. This converter treats cURL flags as native cURL; use <code>curl.exe</code> when running them in that shell. Browser-generated Invoke-WebRequest commands, session cookies, headers and literal bodies are supported. Arbitrary scripts and expressions are not executed.</p>" }],
  faqs: [
    { q: "Can I convert PowerShell cURL to Python or JavaScript?", a: "Yes. Paste a literal cURL command formatted for PowerShell and select Python, JavaScript or another target. Parsing and code generation happen locally in your browser." },
    { q: "Can I generate PowerShell code too?", a: "Yes. Select PowerShell (Invoke-WebRequest) from Target language to generate a PowerShell 7 script and download it as a .ps1 file." },
    { q: "Does this accept Invoke-WebRequest scripts?", a: "Yes. Paste the complete browser-generated request, including its WebRequestSession and cookies. Literal headers, methods and bodies are supported. Arbitrary scripts and variables are not evaluated." },
  ],
};
