import { empty, type Tool } from "./types";

export const webhookInspector: Tool = {
  slug: "webhook-inspector",
  name: "Webhook Inspector",
  title: "Free Webhook Inspector — Capture and Debug HTTP Requests",
  category: "Webhooks",
  summary: "Get a webhook test URL automatically. Inspect HTTP headers, JSON bodies, cookies and query parameters with live request polling.",
  description: "Inspect incoming webhooks with a URL assigned automatically to your browser. View headers, query parameters, cookies and request bodies. Captured data expires after one hour.",
  manual: true,
  inputs: [],
  run: () => empty("Generate a webhook URL to begin."),
  docs: [
    { heading: "Test and debug incoming webhooks", html: '<p>Open this page to get your browser’s webhook URL automatically. Paste it into your application or provider’s webhook settings, send a test event, and watch requests arrive. Select a request to inspect headers, repeated query parameters, cookies, form fields and its body. JSON formatting and a reconstructed raw view make payloads easier to read.</p><p>To send a test event yourself, use the <a href="/tools/webhook-tester">Webhook Tester</a>. For client integration code, try <a href="/tools/curl-to-code">cURL to Code</a> or <a href="/tools/powershell-to-code">PowerShell to Code</a>.</p>' },
    { heading: "One URL per browser", html: '<p>A private browser cookie keeps the same capture URL across reloads and tabs. There is no create button. Each capture window lasts one hour, after which its data expires and the inspector reconnects to the same URL. Refreshing does not extend the current window. Clearing cookies or using a different browser creates a separate URL.</p>' },
    { heading: "Supported requests and limits", html: '<p>GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS requests are supported, including subpaths. Browser CORS preflights are answered without being added to the request list. Each one-hour window accepts up to 100 requests with a maximum body size of 1 MiB. Binary bodies are displayed as base64. Use test data; anyone with the URL can send requests, but reading them requires your browser cookie.</p>' },
  ],
  faqs: [
    { q: "What is a webhook inspector?", a: "A webhook inspector provides an HTTP endpoint that captures incoming requests so you can inspect their method, headers, query parameters and body while debugging integrations." },
    { q: "Do I need to create a new URL for every test?", a: "No. One URL is assigned automatically to your browser and reused across reloads and tabs. Captured requests expire after one hour." },
    { q: "Can someone with the URL read my requests?", a: "The capture URL allows sending requests. Viewing captured data also requires the private cookie stored in your browser." },
    { q: "Why is my request not arriving?", a: "Check the URL, make sure the capture window is active, and check whether the 100-request or 1 MiB body limit was reached. A localhost URL is only reachable from your machine; external providers need a publicly reachable deployment." },
  ],
};
