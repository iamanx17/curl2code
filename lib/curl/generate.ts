import { Request, headerValue } from "./parse";

const q = (value: string) => JSON.stringify(value);

const php = (value: string) => "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const indent = (text: string, pad: string) =>
  text.split("\n").map((line) => (line ? pad + line : line)).join("\n");

const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

const hasHeaders = (request: Request) => Object.keys(request.headers).length > 0;

const isMultipart = (request: Request) => request.body?.kind === "multipart";

function toJsLiteral(value: unknown, pad = ""): string {
  if (value === null) return "null";

  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const items = value.map((item) => `${pad}  ${toJsLiteral(item, pad + "  ")}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return "{}";

    const items = keys.map((key) => {
      const safe = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : q(key);
      return `${pad}  ${safe}: ${toJsLiteral((value as Record<string, unknown>)[key], pad + "  ")}`;
    });

    return `{\n${items.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(value);
}

function toPyLiteral(value: unknown, pad = ""): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";

  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const items = value.map((item) => `${pad}    ${toPyLiteral(item, pad + "    ")}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return "{}";

    const items = keys.map(
      (key) => `${pad}    ${q(key)}: ${toPyLiteral((value as Record<string, unknown>)[key], pad + "    ")}`,
    );

    return `{\n${items.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(value);
}

/** Pretty JSON for languages that can hold it across lines. */
function bodyText(request: Request) {
  const body = request.body!;
  return body.kind === "json" ? JSON.stringify(body.json, null, 2) : (body as { raw: string }).raw;
}

/** One-line JSON for languages that embed the body as an escaped literal. */
function bodyCompact(request: Request) {
  const body = request.body!;
  return body.kind === "json" ? JSON.stringify(body.json) : (body as { raw: string }).raw;
}

export function fetchJs(request: Request) {
  const lines: string[] = [];
  const options = [`method: ${q(request.method)}`];

  if (request.body?.kind === "multipart") {
    lines.push("const form = new FormData();");

    for (const part of request.body.parts) {
      if (part.isFile) {
        lines.push(`// pick this file from an <input type="file"> element`);
        lines.push(`form.append(${q(part.name)}, fileInput.files[0], ${q(fileName(part.value))});`);
      } else {
        lines.push(`form.append(${q(part.name)}, ${q(part.value)});`);
      }
    }

    lines.push("");
  }

  if (hasHeaders(request)) {
    const entries = Object.entries(request.headers).map(([key, value]) => `    ${q(key)}: ${q(value)}`);
    options.push(`headers: {\n${entries.join(",\n")}\n  }`);
  }

  if (request.body) {
    if (request.body.kind === "json") {
      options.push(`body: JSON.stringify(${toJsLiteral(request.body.json, "  ")})`);
    } else if (request.body.kind === "form") {
      const pairs = request.body.pairs.map(([key, value]) => `    ${q(key)}: ${q(value)}`);
      options.push(`body: new URLSearchParams({\n${pairs.join(",\n")}\n  })`);
    } else if (request.body.kind === "multipart") {
      options.push("body: form");
    } else {
      options.push(`body: ${q(request.body.raw)}`);
    }
  }

  lines.push(`const response = await fetch(${q(request.url)}, {`);
  lines.push("  " + options.join(",\n  "));
  lines.push("});");
  lines.push("");
  lines.push("if (!response.ok) {");
  lines.push("  throw new Error(`Request failed with ${response.status} ${response.statusText}`);");
  lines.push("}");
  lines.push("");
  lines.push("const data = await response.json();");
  lines.push("");
  lines.push("console.log(data);");

  return lines.join("\n");
}

export function nodeJs(request: Request) {
  return `// Node.js 18 or newer — fetch is built in, no packages needed.

async function main() {

${indent(fetchJs(request), "  ")}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`;
}

export function axios(request: Request) {
  const lines = ['import axios from "axios";', ""];
  const config = [`method: ${q(request.method.toLowerCase())}`, `url: ${q(request.url)}`];

  if (request.body?.kind === "multipart") {
    lines.push("const form = new FormData();");

    for (const part of request.body.parts) {
      lines.push(
        part.isFile
          ? `form.append(${q(part.name)}, fileInput.files[0]);`
          : `form.append(${q(part.name)}, ${q(part.value)});`,
      );
    }

    lines.push("");
  }

  if (hasHeaders(request)) {
    const entries = Object.entries(request.headers).map(([key, value]) => `      ${q(key)}: ${q(value)}`);
    config.push(`headers: {\n${entries.join(",\n")}\n    }`);
  }

  if (request.body) {
    if (request.body.kind === "json") config.push(`data: ${toJsLiteral(request.body.json, "    ")}`);
    else if (request.body.kind === "form") {
      const pairs = request.body.pairs.map(([key, value]) => `      ${q(key)}: ${q(value)}`);
      config.push(`data: new URLSearchParams({\n${pairs.join(",\n")}\n    })`);
    } else if (request.body.kind === "multipart") config.push("data: form");
    else config.push(`data: ${q(request.body.raw)}`);
  }

  lines.push("try {");
  lines.push("");
  lines.push("  const response = await axios({");
  lines.push("    " + config.join(",\n    "));
  lines.push("  });");
  lines.push("");
  lines.push("  console.log(response.data);");
  lines.push("");
  lines.push("} catch (error) {");
  lines.push("  // axios throws on any non-2xx status");
  lines.push("  console.error(error.response?.status, error.response?.data ?? error.message);");
  lines.push("}");

  return lines.join("\n");
}

export function python(request: Request) {
  const lines = ["import requests", "", `url = ${q(request.url)}`, ""];
  const args = ["url", "headers=headers"];

  if (hasHeaders(request)) {
    const entries = Object.entries(request.headers).map(([key, value]) => `    ${q(key)}: ${q(value)}`);
    lines.push(`headers = {\n${entries.join(",\n")}\n}`);
  } else {
    lines.push("headers = {}");
  }

  lines.push("");

  if (request.body?.kind === "json") {
    lines.push(`payload = ${toPyLiteral(request.body.json)}`, "");
    args.push("json=payload");
  } else if (request.body?.kind === "form") {
    const pairs = request.body.pairs.map(([key, value]) => `    ${q(key)}: ${q(value)}`);
    lines.push(`payload = {\n${pairs.join(",\n")}\n}`, "");
    args.push("data=payload");
  } else if (request.body?.kind === "multipart") {
    const fields = request.body.parts.filter((part) => !part.isFile);
    const files = request.body.parts.filter((part) => part.isFile);

    if (fields.length) {
      const entries = fields.map((part) => `    ${q(part.name)}: ${q(part.value)}`);
      lines.push(`payload = {\n${entries.join(",\n")}\n}`, "");
      args.push("data=payload");
    }

    if (files.length) {
      const entries = files.map(
        (part) =>
          `    ${q(part.name)}: (${q(fileName(part.value))}, open(${q(part.value)}, "rb")${
            part.type ? ", " + q(part.type) : ""
          })`,
      );
      lines.push(`files = {\n${entries.join(",\n")}\n}`, "");
      args.push("files=files");
    }
  } else if (request.body) {
    lines.push(`payload = ${q(request.body.raw)}`, "");
    args.push("data=payload");
  }

  args.push("timeout=30");
  if (request.insecure) args.push("verify=False");

  lines.push(`response = requests.${request.method.toLowerCase()}(${args.join(", ")})`);
  lines.push("");
  lines.push("response.raise_for_status()");
  lines.push("");
  lines.push("print(response.status_code)");
  lines.push("print(response.json())");

  return lines.join("\n");
}

export function go(request: Request) {
  const imports = new Set(['"fmt"', '"io"', '"net/http"', '"time"']);
  const setup: string[] = [];

  let bodyArg = "nil";

  if (request.body?.kind === "multipart") {
    imports.add('"bytes"').add('"mime/multipart"').add('"os"');

    setup.push("var buf bytes.Buffer", "writer := multipart.NewWriter(&buf)", "");

    for (const part of request.body.parts) {
      if (part.isFile) {
        setup.push(`file, err := os.Open(${q(part.value)})`);
        setup.push("if err != nil {", "\tpanic(err)", "}");
        setup.push(`part, err := writer.CreateFormFile(${q(part.name)}, ${q(fileName(part.value))})`);
        setup.push("if err != nil {", "\tpanic(err)", "}");
        setup.push("io.Copy(part, file)", "file.Close()");
      } else {
        setup.push(`writer.WriteField(${q(part.name)}, ${q(part.value)})`);
      }
    }

    setup.push("writer.Close()", "");
    bodyArg = "&buf";
  } else if (request.body) {
    imports.add('"strings"');

    const text = bodyText(request);
    setup.push(`payload := strings.NewReader(${text.includes("`") ? q(text) : "`" + text + "`"})`, "");
    bodyArg = "payload";
  }

  const lines = [
    "package main",
    "",
    "import (",
    ...[...imports].sort().map((name) => "\t" + name),
    ")",
    "",
    "func main() {",
    "",
  ];

  for (const line of setup) lines.push(line ? "\t" + line : "");

  lines.push(`\treq, err := http.NewRequest(${q(request.method)}, ${q(request.url)}, ${bodyArg})`);
  lines.push("\tif err != nil {", "\t\tpanic(err)", "\t}", "");

  for (const [key, value] of Object.entries(request.headers)) {
    lines.push(`\treq.Header.Set(${q(key)}, ${q(value)})`);
  }

  if (isMultipart(request)) {
    lines.push('\treq.Header.Set("Content-Type", writer.FormDataContentType())');
  }

  if (hasHeaders(request) || isMultipart(request)) lines.push("");

  lines.push("\tclient := &http.Client{Timeout: 30 * time.Second}", "");
  lines.push("\tres, err := client.Do(req)");
  lines.push("\tif err != nil {", "\t\tpanic(err)", "\t}");
  lines.push("\tdefer res.Body.Close()", "");
  lines.push("\tbody, err := io.ReadAll(res.Body)");
  lines.push("\tif err != nil {", "\t\tpanic(err)", "\t}", "");
  lines.push("\tfmt.Println(res.Status)");
  lines.push("\tfmt.Println(string(body))");
  lines.push("}");

  return lines.join("\n");
}

export function java(request: Request) {
  const lines = [
    "import java.net.URI;",
    "import java.net.http.HttpClient;",
    "import java.net.http.HttpRequest;",
    "import java.net.http.HttpResponse;",
    "import java.time.Duration;",
    "",
  ];

  const pre: string[] = [];
  let publisher = "HttpRequest.BodyPublishers.noBody()";

  if (request.body?.kind === "multipart") {
    const boundary = "----curl2codeBoundary";

    pre.push(`String boundary = ${q(boundary)};`, "StringBuilder form = new StringBuilder();");

    for (const part of request.body.parts) {
      if (part.isFile) pre.push("// files need binary parts — read them with Files.readAllBytes()");

      pre.push(`form.append("--").append(boundary).append("\\r\\n")`);
      pre.push(`    .append("Content-Disposition: form-data; name=\\"${part.name}\\"\\r\\n\\r\\n")`);
      pre.push(`    .append(${q(part.value)}).append("\\r\\n");`);
    }

    pre.push('form.append("--").append(boundary).append("--\\r\\n");', "");
    publisher = "HttpRequest.BodyPublishers.ofString(form.toString())";
  } else if (request.body) {
    const text = bodyText(request);

    // a text block would reinterpret escapes, so only use one when it is safe
    if (/[\\]|"""/.test(text)) {
      pre.push(`String payload = ${q(text)};`);
    } else {
      pre.push('String payload = """');
      for (const line of text.split("\n")) pre.push("    " + line);
      pre.push('    """;');
    }

    pre.push("");
    publisher = "HttpRequest.BodyPublishers.ofString(payload)";
  }

  lines.push("public class Main {", "", "    public static void main(String[] args) throws Exception {", "");

  for (const line of pre) lines.push(line ? "        " + line : "");

  lines.push("        HttpClient client = HttpClient.newBuilder()");
  lines.push("            .connectTimeout(Duration.ofSeconds(30))");
  lines.push(
    request.followRedirects
      ? "            .followRedirects(HttpClient.Redirect.NORMAL)"
      : "            .followRedirects(HttpClient.Redirect.NEVER)",
  );
  lines.push("            .build();", "");
  lines.push("        HttpRequest request = HttpRequest.newBuilder()");
  lines.push(`            .uri(URI.create(${q(request.url)}))`);

  for (const [key, value] of Object.entries(request.headers)) {
    lines.push(`            .header(${q(key)}, ${q(value)})`);
  }

  if (isMultipart(request)) {
    lines.push('            .header("Content-Type", "multipart/form-data; boundary=" + boundary)');
  }

  lines.push(`            .method(${q(request.method)}, ${publisher})`);
  lines.push("            .build();", "");
  lines.push("        HttpResponse<String> response =");
  lines.push("            client.send(request, HttpResponse.BodyHandlers.ofString());", "");
  lines.push("        System.out.println(response.statusCode());");
  lines.push("        System.out.println(response.body());");
  lines.push("    }");
  lines.push("}");

  return lines.join("\n");
}

export function phpCurl(request: Request) {
  const lines = ["<?php", "", "$ch = curl_init();", ""];

  const options = [
    `CURLOPT_URL => ${php(request.url)}`,
    "CURLOPT_RETURNTRANSFER => true",
    "CURLOPT_TIMEOUT => 30",
    `CURLOPT_CUSTOMREQUEST => ${php(request.method)}`,
  ];

  if (request.followRedirects) options.push("CURLOPT_FOLLOWLOCATION => true");
  if (request.insecure) options.push("CURLOPT_SSL_VERIFYPEER => false");

  if (hasHeaders(request)) {
    const entries = Object.entries(request.headers).map(([key, value]) => "        " + php(`${key}: ${value}`));
    options.push(`CURLOPT_HTTPHEADER => [\n${entries.join(",\n")}\n    ]`);
  }

  if (request.body?.kind === "multipart") {
    const entries = request.body.parts.map(
      (part) =>
        "        " + php(part.name) + " => " + (part.isFile ? `new CURLFile(${php(part.value)})` : php(part.value)),
    );
    options.push(`CURLOPT_POSTFIELDS => [\n${entries.join(",\n")}\n    ]`);
  } else if (request.body) {
    options.push(`CURLOPT_POSTFIELDS => ${php(bodyText(request))}`);
  }

  lines.push("curl_setopt_array($ch, [");
  lines.push("    " + options.join(",\n    "));
  lines.push("]);", "");
  lines.push("$response = curl_exec($ch);");
  lines.push("$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);", "");
  lines.push("if ($response === false) {");
  lines.push("    throw new RuntimeException(curl_error($ch));");
  lines.push("}", "");
  lines.push("curl_close($ch);", "");
  lines.push("echo $status . PHP_EOL;");
  lines.push("echo $response . PHP_EOL;");

  return lines.join("\n");
}

export function csharp(request: Request) {
  const lines = ["using System;", "using System.Net.Http;", "using System.Threading.Tasks;", ""];

  lines.push("class Program");
  lines.push("{");
  lines.push("    static async Task Main()");
  lines.push("    {");
  lines.push("        using var client = new HttpClient();");
  lines.push("        client.Timeout = TimeSpan.FromSeconds(30);", "");
  lines.push(
    `        var request = new HttpRequestMessage(new HttpMethod(${q(request.method)}), ${q(request.url)});`,
    "",
  );

  for (const [key, value] of Object.entries(request.headers)) {
    if (/^content-/i.test(key)) continue;
    lines.push(`        request.Headers.TryAddWithoutValidation(${q(key)}, ${q(value)});`);
  }

  if (request.body?.kind === "multipart") {
    lines.push("", "        var form = new MultipartFormDataContent();");

    for (const part of request.body.parts) {
      lines.push(
        part.isFile
          ? `        form.Add(new ByteArrayContent(System.IO.File.ReadAllBytes(${q(part.value)})), ${q(part.name)}, ${q(fileName(part.value))});`
          : `        form.Add(new StringContent(${q(part.value)}), ${q(part.name)});`,
      );
    }

    lines.push("        request.Content = form;");
  } else if (request.body) {
    const contentType = headerValue(request.headers, "content-type");

    lines.push(
      "",
      `        request.Content = new StringContent(${q(bodyCompact(request))}, System.Text.Encoding.UTF8, ${q(
        contentType ? contentType.split(";")[0] : "text/plain",
      )});`,
    );
  }

  lines.push("", "        var response = await client.SendAsync(request);");
  lines.push("        var body = await response.Content.ReadAsStringAsync();", "");
  lines.push("        Console.WriteLine((int)response.StatusCode);");
  lines.push("        Console.WriteLine(body);", "");
  lines.push("        response.EnsureSuccessStatusCode();");
  lines.push("    }");
  lines.push("}");

  return lines.join("\n");
}

export function ruby(request: Request) {
  const lines = [
    'require "uri"',
    'require "net/http"',
    'require "json"',
    "",
    `url = URI(${q(request.url)})`,
    "",
    "http = Net::HTTP.new(url.host, url.port)",
    'http.use_ssl = url.scheme == "https"',
    "http.read_timeout = 30",
  ];

  if (request.insecure) lines.push("http.verify_mode = OpenSSL::SSL::VERIFY_NONE");

  lines.push("");

  const methodClass = (
    {
      GET: "Get", POST: "Post", PUT: "Put", PATCH: "Patch",
      DELETE: "Delete", HEAD: "Head", OPTIONS: "Options",
    } as Record<string, string>
  )[request.method];

  lines.push(
    methodClass
      ? `request = Net::HTTP::${methodClass}.new(url)`
      : `request = Net::HTTPGenericRequest.new(${q(request.method)}, true, true, url)`,
  );

  lines.push("");

  for (const [key, value] of Object.entries(request.headers)) {
    lines.push(`request[${q(key)}] = ${q(value)}`);
  }

  if (request.body?.kind === "multipart") {
    lines.push("", "request.set_form([");

    for (const part of request.body.parts) {
      lines.push(
        part.isFile
          ? `  [${q(part.name)}, File.open(${q(part.value)})]`
          : `  [${q(part.name)}, ${q(part.value)}]`,
      );
    }

    lines.push('], "multipart/form-data")');
  } else if (request.body) {
    lines.push("", `request.body = ${q(bodyCompact(request))}`);
  }

  lines.push("", "response = http.request(request)", "");
  lines.push("puts response.code");
  lines.push("puts response.read_body");

  return lines.join("\n");
}

const psQuote = (value: string) => "'" + value.replace(/'/g, "''") + "'";

function powershell(request: Request) {
  const lines = ["# PowerShell 7+", "$request = @{", `  Uri = ${psQuote(request.url)}`, `  Method = ${psQuote(request.method)}`,
    `  MaximumRedirection = ${request.followRedirects ? 10 : 0}`, "  SkipHttpErrorCheck = $true"];
  if (request.insecure) lines.push("  SkipCertificateCheck = $true");
  const headers = Object.entries(request.headers).filter(([name]) => name.toLowerCase() !== "content-type");
  if (headers.length) {
    lines.push("  Headers = @{");
    for (const [name, value] of headers) lines.push(`    ${psQuote(name)} = ${psQuote(value)}`);
    lines.push("  }");
  }
  if (request.body?.kind === "multipart") {
    lines.push("  Form = @{");
    const fields = new Map<string, string[]>();
    for (const part of request.body.parts) {
      const values = fields.get(part.name) ?? [];
      values.push(part.isFile ? `(Get-Item -LiteralPath ${psQuote(part.value)})` : psQuote(part.value));
      fields.set(part.name, values);
    }
    for (const [name, values] of fields) lines.push(`    ${psQuote(name)} = ${values.length === 1 ? values[0] : `@(${values.join(", ")})`}`);
    lines.push("  }");
  } else {
    const contentType = headerValue(request.headers, "content-type") || (request.body?.kind === "json" ? "application/json" : "");
    if (contentType) lines.push(`  ContentType = ${psQuote(contentType)}`);
    if (request.body) lines.push(`  Body = [System.Text.Encoding]::UTF8.GetBytes(${psQuote(request.body.raw)})`);
  }
  lines.push("}", "", "$response = Invoke-WebRequest @request", "$response.StatusCode", "$response.Content");
  return lines.join("\n");
}

export const LANGUAGES = [
  { id: "javascript", label: "JavaScript (fetch)", ext: "js", generate: fetchJs },
  { id: "node", label: "Node.js (fetch)", ext: "mjs", generate: nodeJs },
  { id: "axios", label: "Axios", ext: "js", generate: axios },
  { id: "python", label: "Python (requests)", ext: "py", generate: python },
  { id: "go", label: "Go (net/http)", ext: "go", generate: go },
  { id: "java", label: "Java (HttpClient)", ext: "java", generate: java },
  { id: "php", label: "PHP (cURL)", ext: "php", generate: phpCurl },
  { id: "csharp", label: "C# (HttpClient)", ext: "cs", generate: csharp },
  { id: "ruby", label: "Ruby (Net::HTTP)", ext: "rb", generate: ruby },
  { id: "powershell", label: "PowerShell (Invoke-WebRequest)", ext: "ps1", generate: powershell },
] as const;
