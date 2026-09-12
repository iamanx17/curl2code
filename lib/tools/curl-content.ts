import { Doc, Faq } from "./types";

export type LanguageContent = {
  slug: string;
  lang: string;
  name: string;
  summary: string;
  title: string;
  description: string;
  intro: string;
  notes: string;
};

export const LANGUAGE_CONTENT: LanguageContent[] = [
  {
    slug: "curl-to-powershell",
    lang: "powershell",
    name: "PowerShell",
    summary: "Convert cURL to PowerShell Invoke-WebRequest with headers, JSON, authentication and file uploads.",
    title: "cURL to PowerShell Converter — Invoke-WebRequest Online",
    description: "Convert cURL commands into PowerShell 7 scripts for Invoke-WebRequest. Generate headers, JSON bodies, cookies and multipart requests locally in your browser.",
    intro: "Paste a cURL request and generate a PowerShell 7 script using <code>Invoke-WebRequest</code>. Copy the script or download a <code>.ps1</code> file. Headers, authentication and JSON bodies are preserved.",
    notes: "<p>Run the generated script in PowerShell 7 or newer with <code>pwsh ./request.ps1</code>. JSON and form bodies use UTF-8 bytes. Multipart files use <code>Get-Item</code>; update the file paths before running. PowerShell selects the MIME type for uploaded files.</p><p>The script prints the response status and body, including HTTP error responses. Redirects follow the original cURL flags. For cURL commands copied with PowerShell quoting, use <a href=\"/tools/powershell-to-code\">PowerShell to Code</a> instead of this page.</p>",
  },
  {
    slug: "curl-to-javascript",
    lang: "javascript",
    name: "JavaScript",
    summary: "Browser-ready fetch() with async/await and a status check.",
    title: "cURL to JavaScript Converter — Generate fetch() Code",
    description: "Convert a cURL command to JavaScript fetch() code. Handles headers, JSON and form bodies, basic auth and file uploads. Free, runs in your browser.",
    intro: "Paste a cURL command and get an equivalent <code>fetch()</code> call using async/await, with headers, body and a response status check already wired up.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>No dependency.</strong> <code>fetch</code> is built into every current browser. The snippet uses top-level <code>await</code>, so run it inside an <code>async</code> function or an ES module.</li>\n  <li><strong>fetch does not throw on 4xx or 5xx.</strong> A 500 still resolves the promise, which is why the generated code checks <code>response.ok</code> explicitly. Removing that check is the single most common cause of silent API failures.</li>\n  <li><strong>CORS applies in the browser.</strong> cURL ignores the same-origin policy; your page does not. If the API does not send <code>Access-Control-Allow-Origin</code>, the request must go through your own backend.</li>\n  <li><strong>Do not ship secrets.</strong> An <code>Authorization</code> header in browser JavaScript is readable by anyone who opens DevTools. Keep tokens on a server and proxy the call.</li>\n  <li><strong>Timeouts are opt-in.</strong> <code>fetch</code> has no default timeout. Add <code>signal: AbortSignal.timeout(30_000)</code> to the options object if you need one.</li>\n</ul>",
  },
  {
    slug: "curl-to-python",
    lang: "python",
    name: "Python",
    summary: "Python 3 script using requests, with a timeout and raise_for_status().",
    title: "cURL to Python Converter — Generate requests Code",
    description: "Convert a cURL command to Python requests code. Headers, JSON bodies, form data, file uploads and basic auth are all handled. Free and browser-based.",
    intro: "Paste a cURL command and get a Python 3 script built on <code>requests</code>, with the body converted into a real Python dictionary wherever the payload is valid JSON.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>Dependency.</strong> <code>pip install requests</code>. If you would rather not add one, the same request works with the standard library's <code>urllib.request</code>, at the cost of more boilerplate.</li>\n  <li><strong>json= versus data=.</strong> The generated code uses <code>json=</code> for JSON payloads, which sets <code>Content-Type</code> and serialises for you, and <code>data=</code> for form-encoded bodies. Passing a dict to <code>data=</code> instead would silently form-encode your JSON.</li>\n  <li><strong>Always pass a timeout.</strong> <code>requests</code> waits forever by default. Every snippet here sets <code>timeout=30</code>; keep it.</li>\n  <li><strong>raise_for_status().</strong> <code>requests</code> does not raise on a 404 or a 500 on its own. The generated call raises so failures are loud.</li>\n  <li><strong>verify=False.</strong> Emitted only when the command used <code>-k</code>. It disables certificate checking and should never reach production; point <code>verify=</code> at your CA bundle instead.</li>\n  <li><strong>Reusing connections.</strong> For more than a handful of calls, move to <code>with requests.Session() as session:</code> — connection pooling makes a large difference.</li>\n</ul>",
  },
  {
    slug: "curl-to-nodejs",
    lang: "node",
    name: "Node.js",
    summary: "Node 18+ script using the built-in global fetch — no packages.",
    title: "cURL to Node.js Converter — Generate fetch Code",
    description: "Convert a cURL command to a Node.js script using the built-in fetch API. No dependencies, error handling included. Free and runs in your browser.",
    intro: "Paste a cURL command and get a Node.js script wrapped in an async <code>main()</code>, using the global <code>fetch</code> that ships with Node 18 and later.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>Node 18 or newer.</strong> <code>fetch</code>, <code>FormData</code> and <code>Blob</code> are global from Node 18. On Node 16 install <code>undici</code> and import them from it.</li>\n  <li><strong>Exit code.</strong> The snippet sets <code>process.exitCode = 1</code> on failure rather than calling <code>process.exit()</code>, so pending writes to stdout still flush — this matters in CI.</li>\n  <li><strong>No CORS, no cookie jar.</strong> Server-side <code>fetch</code> skips the same-origin policy, and it does not persist cookies between calls. If the API needs a session cookie you must forward it yourself.</li>\n  <li><strong>Proxies are not automatic.</strong> Node's fetch ignores <code>HTTP_PROXY</code>. Behind a corporate proxy, set a <code>ProxyAgent</code> from <code>undici</code> as the dispatcher.</li>\n  <li><strong>Keep secrets in the environment.</strong> Replace a pasted token with <code>process.env.API_TOKEN</code> before committing the file.</li>\n</ul>",
  },
  {
    slug: "curl-to-axios",
    lang: "axios",
    name: "Axios",
    summary: "Axios request config for Node or the browser, with try/catch.",
    title: "cURL to Axios Converter — Generate Axios Requests",
    description: "Convert a cURL command into an Axios request config for Node.js or the browser, including headers, JSON bodies and error handling. Free, no signup.",
    intro: "Paste a cURL command and get an Axios request config, wrapped in the try/catch that Axios's throw-on-error behaviour makes necessary.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>Dependency.</strong> <code>npm install axios</code>. The snippet uses ESM <code>import</code>; on CommonJS use <code>const axios = require(\"axios\")</code>.</li>\n  <li><strong>Axios throws on non-2xx.</strong> The opposite of <code>fetch</code>. Inspect <code>error.response.status</code> and <code>error.response.data</code> — a network failure has no <code>response</code> at all, which is why the generated catch uses optional chaining.</li>\n  <li><strong>JSON is automatic.</strong> Pass an object as <code>data</code> and Axios serialises it and sets <code>Content-Type</code>. It also parses the response, so there is no second <code>await</code>.</li>\n  <li><strong>Multipart.</strong> When a <code>FormData</code> is passed, let Axios set the content type — a hand-written <code>multipart/form-data</code> header without a boundary breaks the request.</li>\n  <li><strong>Shared configuration.</strong> If several calls hit the same API, replace the inline URL and headers with <code>axios.create({ baseURL, headers })</code>.</li>\n</ul>",
  },
  {
    slug: "curl-to-go",
    lang: "go",
    name: "Go",
    summary: "Idiomatic net/http with a client timeout and deferred body close.",
    title: "cURL to Go Converter — Generate net/http Code",
    description: "Convert a cURL command to Go code using net/http, including headers, request bodies, multipart uploads and a client timeout. Free browser-based tool.",
    intro: "Paste a cURL command and get a complete Go program using the standard library's <code>net/http</code> — no third-party HTTP client required.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>Standard library only.</strong> Everything imported here ships with Go. Multipart uploads use <code>mime/multipart</code>.</li>\n  <li><strong>Always set a client timeout.</strong> <code>http.DefaultClient</code> has none, so a hung server hangs your program. The snippet builds an <code>&amp;http.Client{Timeout: 30 * time.Second}</code>.</li>\n  <li><strong>Close the body.</strong> <code>defer res.Body.Close()</code> is not optional — skipping it leaks connections, and the leak only shows up under load.</li>\n  <li><strong>panic is a placeholder.</strong> The generated error handling panics so the snippet stays short. Replace each <code>panic(err)</code> with a returned error before using it in a real package.</li>\n  <li><strong>Host header.</strong> Setting <code>req.Header.Set(\"Host\", …)</code> has no effect in Go; assign <code>req.Host</code> instead.</li>\n  <li><strong>Skipping TLS verification</strong> requires a custom <code>http.Transport</code> with <code>TLSClientConfig</code>, which is deliberately not generated — it is worth writing consciously.</li>\n</ul>",
  },
  {
    slug: "curl-to-java",
    lang: "java",
    name: "Java",
    summary: "JDK 11+ java.net.http HttpClient with no external dependencies.",
    title: "cURL to Java Converter — Generate HttpClient Code",
    description: "Convert a cURL command to Java code using the built-in java.net.http HttpClient (JDK 11+). Headers, bodies and timeouts included. Free and client-side.",
    intro: "Paste a cURL command and get a runnable Java class built on <code>java.net.http.HttpClient</code>, the client that has shipped with the JDK since version 11.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>JDK 11 or newer</strong> for <code>HttpClient</code>; the generated body uses a text block, which needs JDK 15 or newer. On an older JDK, replace it with a concatenated string.</li>\n  <li><strong>No dependencies.</strong> Nothing from Apache HttpClient or OkHttp is required.</li>\n  <li><strong>Redirects are off by default.</strong> The snippet sets the policy explicitly to match what your cURL command did.</li>\n  <li><strong>Restricted headers.</strong> The JDK refuses to let you set <code>Host</code>, <code>Content-Length</code>, <code>Connection</code> and a few others. If your command sets one, it will be rejected at runtime unless you set the <code>jdk.httpclient.allowRestrictedHeaders</code> system property.</li>\n  <li><strong>Multipart is manual.</strong> There is no built-in multipart publisher, so the generated code assembles the boundary itself. For binary files, swap the string builder for <code>BodyPublishers.ofByteArrays()</code> and read the file with <code>Files.readAllBytes()</code>.</li>\n  <li><strong>Reuse the client.</strong> <code>HttpClient</code> is thread-safe and holds a connection pool. Build one per application, not one per request.</li>\n</ul>",
  },
  {
    slug: "curl-to-php",
    lang: "php",
    name: "PHP",
    summary: "PHP using the built-in cURL extension, closest to the original command.",
    title: "cURL to PHP Converter — Generate PHP cURL Code",
    description: "Convert a cURL command to PHP using the built-in cURL extension, with headers, POST fields, file uploads and error handling. Free, no signup.",
    intro: "Paste a cURL command and get PHP built on <code>ext-curl</code>, the closest translation available because it drives the same underlying library.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>Requires ext-curl</strong>, which is bundled with almost every PHP distribution. Check with <code>php -m | grep curl</code>.</li>\n  <li><strong>CURLOPT_RETURNTRANSFER is essential.</strong> Without it <code>curl_exec()</code> prints the response straight to output and returns <code>true</code>. The generated code always sets it.</li>\n  <li><strong>curl_exec does not fail on 4xx.</strong> It returns <code>false</code> only for transport errors. Read <code>CURLINFO_HTTP_CODE</code> — which the snippet does — to detect an HTTP-level failure.</li>\n  <li><strong>File uploads use <code>CURLFile</code>.</strong> Passing a raw <code>@/path</code> string has been disabled since PHP 5.6 and will be sent as a literal.</li>\n  <li><strong>Array versus string POST fields.</strong> An array makes cURL send <code>multipart/form-data</code>; a pre-encoded string sends <code>application/x-www-form-urlencoded</code>. The generator picks the one matching your command.</li>\n  <li><strong>Prefer Guzzle for anything larger</strong> than a script — it gives you retries, middleware and PSR-7 messages.</li>\n</ul>",
  },
  {
    slug: "curl-to-csharp",
    lang: "csharp",
    name: "C#",
    summary: "C# HttpClient with an async Main and a status check.",
    title: "cURL to C# Converter — Generate HttpClient Code",
    description: "Convert a cURL command to C# using HttpClient, with headers, request content and async/await. Free developer tool that runs entirely in your browser.",
    intro: "Paste a cURL command and get a C# program using <code>HttpClient</code> and <code>HttpRequestMessage</code>, with content headers assigned where .NET expects them.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>.NET 6 or newer</strong> for top-level async <code>Main</code>. The API itself works back to .NET Framework 4.5.</li>\n  <li><strong>Content headers are separate.</strong> .NET rejects <code>Content-Type</code> on <code>request.Headers</code>; it belongs on <code>request.Content</code>. The generator routes <code>Content-*</code> headers accordingly, which is the mistake most hand-written ports make.</li>\n  <li><strong>Do not create an HttpClient per request.</strong> Each instance holds sockets that linger in <code>TIME_WAIT</code>. Use a static instance, or <code>IHttpClientFactory</code> in ASP.NET Core. The <code>using</code> in the snippet is there because it is a one-shot program.</li>\n  <li><strong>TryAddWithoutValidation</strong> is used so unusual header names from your command are not rejected by .NET's validator.</li>\n  <li><strong>Status handling.</strong> The body is read before <code>EnsureSuccessStatusCode()</code> so an error response is still printed — otherwise the exception hides the server's explanation.</li>\n</ul>",
  },
  {
    slug: "curl-to-ruby",
    lang: "ruby",
    name: "Ruby",
    summary: "Ruby standard library Net::HTTP, TLS aware.",
    title: "cURL to Ruby Converter — Generate Net::HTTP Code",
    description: "Convert a cURL command to Ruby using the standard library Net::HTTP, with headers, bodies, TLS and multipart forms. Free and fully client-side.",
    intro: "Paste a cURL command and get Ruby using <code>Net::HTTP</code> from the standard library, with TLS enabled from the URL scheme.",
    notes: "<ul class=\"doc-list\">\n  <li><strong>No gems required.</strong> <code>net/http</code>, <code>uri</code> and <code>json</code> all ship with Ruby.</li>\n  <li><strong>use_ssl must be set before the request.</strong> Assigning it after <code>start</code> raises. The generated code sets it from the URL scheme immediately after building the client.</li>\n  <li><strong>Query strings survive.</strong> Passing the <code>URI</code> object to the request class keeps the query intact; passing <code>url.path</code> instead — a common shortcut — silently drops it.</li>\n  <li><strong>Net::HTTP does not raise on 4xx or 5xx.</strong> Check <code>response.code</code>, or call <code>response.value</code> to raise.</li>\n  <li><strong>Timeouts.</strong> <code>read_timeout</code> is set; add <code>open_timeout</code> if connecting is also a risk.</li>\n  <li><strong>Faraday or HTTParty</strong> are worth the dependency once you need retries, middleware or a shared connection.</li>\n</ul>",
  },
];

export const CURL_DOCS: Doc[] = [
  { heading: "What this tool does", html: "<p>\n  Paste a cURL command — typed by hand, copied from an API's documentation, or\n  taken from your browser's <strong>Copy as cURL</strong> menu — and get the same\n  request written as runnable code in the language you work in.\n</p>\n<p>\n  The converter parses the command the way a shell would: it handles quoting,\n  backslash line continuations, PowerShell backticks and Windows carets, then\n  reconstructs the request from the flags it finds. The result is a snippet you\n  can paste into a file and run, not a skeleton you have to finish.\n</p>" },
  { heading: "How to use it", html: "<ol class=\"steps\">\n  <li>Pick your target language from the dropdown.</li>\n  <li>Paste the cURL command into the input box. Output appears as you type.</li>\n  <li>Read the warnings, if any — they list options that have no equivalent in code.</li>\n  <li>Press <strong>Copy</strong>, or use <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to re-run.</li>\n</ol>\n<p>\n  Nothing is uploaded. The parser and every generator are plain JavaScript running\n  in your tab, which is why you can safely convert a command that carries a live\n  bearer token.\n</p>" },
  { heading: "Examples", html: "<h3>A JSON POST with a bearer token</h3>\n<pre><code>curl 'https://api.example.com/v1/users' \\\n  -X POST \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  -d '{\"name\":\"Ada Lovelace\",\"admin\":false}'</code></pre>\n<p>\n  Because the body is valid JSON, the converter emits a real object literal —\n  <code>JSON.stringify({ name: \"Ada Lovelace\", admin: false })</code> in JavaScript,\n  a <code>dict</code> passed to <code>json=</code> in Python — rather than an\n  opaque string you would have to edit by hand.\n</p>\n\n<h3>A form post with basic auth</h3>\n<pre><code>curl -u admin:s3cret \\\n  -d 'grant_type=client_credentials' \\\n  -d 'scope=read write' \\\n  https://api.example.com/oauth/token</code></pre>\n<p>\n  The two <code>-d</code> flags are joined with <code>&amp;</code> exactly as cURL\n  joins them, the pair is recognised as form-encoded, and\n  <code>-u</code> is converted into the matching\n  <code>Authorization: Basic</code> header with the credentials Base64-encoded.\n</p>\n\n<h3>A file upload</h3>\n<pre><code>curl -X POST https://api.example.com/v1/files \\\n  -F 'file=@./report.pdf;type=application/pdf' \\\n  -F 'visibility=private'</code></pre>\n<p>\n  Multipart uploads become a <code>FormData</code> object in JavaScript,\n  <code>files=</code> and <code>data=</code> arguments in Python, a\n  <code>multipart.Writer</code> in Go and a <code>CURLFile</code> in PHP. The\n  boundary is left to the HTTP client, which is why any\n  <code>Content-Type: multipart/form-data</code> header you pasted is dropped —\n  keeping it would produce a malformed request.\n</p>" },
  { heading: "Supported cURL options", html: "<table class=\"doc-table\">\n  <thead><tr><th>Option</th><th>How it is converted</th></tr></thead>\n  <tbody>\n    <tr><td><code>-X</code>, <code>--request</code></td><td>Sets the HTTP method.</td></tr>\n    <tr><td><code>-H</code>, <code>--header</code></td><td>Added to the request headers, original casing preserved.</td></tr>\n    <tr><td><code>-d</code>, <code>--data</code>, <code>--data-raw</code>, <code>--data-binary</code>, <code>--data-ascii</code></td><td>Request body. Multiple flags are joined with <code>&amp;</code>. Implies <code>POST</code>.</td></tr>\n    <tr><td><code>--data-urlencode</code></td><td>Value is percent-encoded before being added to the body.</td></tr>\n    <tr><td><code>--json</code></td><td>Body plus <code>Content-Type</code> and <code>Accept: application/json</code>.</td></tr>\n    <tr><td><code>-G</code>, <code>--get</code></td><td>Moves the data onto the query string and keeps the method as <code>GET</code>.</td></tr>\n    <tr><td><code>-F</code>, <code>--form</code>, <code>--form-string</code></td><td>Multipart body. <code>@path</code> is treated as a file, <code>;type=</code> as its content type.</td></tr>\n    <tr><td><code>-u</code>, <code>--user</code></td><td>Encoded into an <code>Authorization: Basic</code> header.</td></tr>\n    <tr><td><code>--oauth2-bearer</code></td><td>Encoded into an <code>Authorization: Bearer</code> header.</td></tr>\n    <tr><td><code>-b</code>, <code>--cookie</code></td><td>Becomes a <code>Cookie</code> header when given inline.</td></tr>\n    <tr><td><code>-A</code>, <code>-e</code></td><td><code>User-Agent</code> and <code>Referer</code> headers.</td></tr>\n    <tr><td><code>-L</code>, <code>-k</code>, <code>--compressed</code></td><td>Mapped to redirect, TLS-verification and compression settings where the client exposes them.</td></tr>\n    <tr><td><code>-I</code>, <code>--head</code></td><td>Sets the method to <code>HEAD</code>.</td></tr>\n    <tr><td><code>-s</code>, <code>-v</code>, <code>-i</code>, <code>-f</code>, <code>-#</code>, <code>--http2</code>, …</td><td>Terminal-only flags. Accepted and ignored, including bundled forms such as <code>-sSL</code>.</td></tr>\n    <tr><td><code>-o</code>, <code>-x</code>, <code>--cacert</code>, <code>--retry</code>, …</td><td>Consumed with their value so they cannot be mistaken for the URL. Reported as a warning.</td></tr>\n  </tbody>\n</table>" },
  { heading: "Common errors and what they mean", html: "<dl class=\"doc-list\">\n  <dt>“This does not start with curl”</dt>\n  <dd>Only the command itself belongs in the box. Remove a leading shell prompt, a pipe into <code>jq</code>, or the <code>&amp;&amp;</code> that joins it to another command.</dd>\n\n  <dt>“Unbalanced single quote”</dt>\n  <dd>The paste is truncated, usually because the command wrapped across lines in a chat window. Copy it again, including the closing quote.</dd>\n\n  <dt>“No URL found in the command”</dt>\n  <dd>The URL is missing, or it was consumed as the value of a flag. Put the URL first — <code>curl https://… -H '…'</code> — and it will always be found.</dd>\n\n  <dt>Body appears as a string, not an object</dt>\n  <dd>The body is not valid JSON. Shell variables such as <code>$TOKEN</code>, single-quoted keys and trailing commas all break parsing. The request is still correct; only the literal is less convenient.</dd>\n\n  <dt>A header you pasted is missing</dt>\n  <dd>Headers without a colon are dropped, and a <code>Content-Type</code> naming a multipart boundary is removed on purpose so the HTTP client can generate its own.</dd>\n</dl>" },
  { heading: "When you would use this", html: "<ul class=\"doc-list\">\n  <li><strong>Turning API documentation into a client.</strong> Most API docs show a cURL example. This gets you from that example to working code without transcribing headers by hand.</li>\n  <li><strong>Reproducing a browser request.</strong> Copy a request as cURL from DevTools to see exactly which headers your front end sends, then port it to a backend script.</li>\n  <li><strong>Moving a request between languages.</strong> Convert once to cURL, then to whatever the receiving service is written in.</li>\n  <li><strong>Debugging an integration.</strong> If cURL works but your code does not, generating the code from the same command shows which header or body detail differs.</li>\n  <li><strong>Writing tests and runbooks.</strong> A support ticket with a cURL command becomes a reproducible test case in your own stack.</li>\n</ul>" },
];

export const CURL_FAQS: Faq[] = [
  { q: "Is the cURL converter free?", a: "Yes. Every tool on curl2code is free, has no account and no usage limit." },
  { q: "Is it safe to paste a command containing an API key?", a: "The converter runs entirely in your browser. The command is parsed by JavaScript on your machine and no part of it — URL, headers or body — is sent to a server. Even so, treat any generated snippet as a secret: it contains the same token you pasted, so do not commit it to a public repository." },
  { q: "Which cURL flags are supported?", a: "Method, URL, headers, cookies, user agent, referer, basic and bearer auth, all the -d/--data variants, --data-urlencode, --json, -G, multipart -F uploads, --compressed, -L and -k. Options with no code equivalent, such as --output or --proxy, are consumed and reported rather than silently dropped." },
  { q: "Why is my body sent as a string instead of an object?", a: "The converter builds a native object literal only when the body is valid JSON. If the JSON has a trailing comma, a single-quoted key or a shell variable in it, it cannot be parsed and is passed through as a raw string instead. Fix the JSON and the output becomes an object." },
  { q: "Can I convert a command copied from Chrome DevTools?", a: "Yes. Right-click a request in the Network tab, choose Copy → Copy as cURL, and paste it in. Browser copies include a long list of headers and cookies; delete the ones your script does not need before using the generated code." },
  { q: "Does the generated code handle errors?", a: "Every snippet checks the response status: fetch and Axios throw on a non-2xx status, Python calls raise_for_status(), Go and Ruby print the status line, and PHP raises on a transport failure. A default timeout is set wherever the client supports one." },
];
