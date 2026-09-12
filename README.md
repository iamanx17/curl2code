# Curl2Code

<<<<<<< HEAD
Free, browser-based developer tools for working with HTTP APIs. 28 tools across 38 pages:
convert a cURL command into code in ten languages, format and compare JSON, decode a JWT,
test a regular expression, explain a cron schedule.

Converters and formatters run locally in the browser. The webhook tester sends requests directly
to your chosen URL. Webhook Inspector captures requests on our own Next.js backend and stores them temporarily
in Redis with a one-hour TTL. No third-party webhook service is used.

## Running with Docker

Docker Compose runs the Next.js frontend and backend in the `app` service and connects it to
`redis` using `REDIS_URL=redis://redis:6379`. No Redis environment setup is needed for Docker.

```sh
make run           # build and start both services at http://localhost:3000
make build         # rebuild the app image
make backend-logs  # follow Next.js/backend logs (also: make logs)
make redis         # interactive redis-cli
make redis-logs    # Redis logs
make ps            # service status
make restart       # restart the app
make down          # stop services; temporary Redis data is discarded
```

Redis waits for a successful health check before the app starts. Its port is only available on
the Compose network. Disk persistence is disabled; memory is capped at 256 MiB and new writes
fail cleanly when full. Backend logs record captured method and body size, never body contents,
headers, cookies, viewing keys or capture URLs.

`APP_PORT=3001 make run` changes the host port. Set `NEXT_PUBLIC_SITE_URL` to your public domain
before building (default `https://curl2code.xyz`); canonical URLs and sitemap entries are generated
at build time. `NEXT_PUBLIC_GA_ID` is also an optional build argument. Rebuild to change either.
External webhook providers need a publicly reachable HTTPS deployment; localhost only works
from your own machine.

For host development instead of Docker, start your own Redis, copy `.env.example` to `.env.local`,
set `REDIS_URL`, then run `npm install` and `npm run dev`. Use Node.js 22 or newer.
=======
> Free developer tools for working with cURL, HTTP APIs, JSON, webhooks, and more.

🌐 **[Try Curl2Code](https://curl2code.xyz)**

Curl2Code is a collection of fast, browser-based developer tools built for developers working with APIs and web requests.

The main tool converts **cURL commands into ready-to-use code** for JavaScript, TypeScript, Python, Node.js, Axios, Go, Java, PHP, C#, and Ruby.

**Nothing you paste is uploaded or stored.** Tools run in your browser. The exception is the Webhook Tester, whose purpose is to send a request.
>>>>>>> 21969763dd23bccde1aacf59875f738482a9b48e

---

<<<<<<< HEAD
```
app/                     routes — one file per page
  tools/[slug]/page.tsx  every tool page comes from here
components/
  ToolRunner.tsx         shared form, output, copy, download
  Output.tsx             draws the blocks a tool returns
lib/
  tools/                 one file per tool: metadata, inputs, run(), page content
    types.ts             the Tool shape and the result helpers
    index.ts             the registry
  curl/                  the cURL parser and the ten code generators
  site.ts                name, URL, navigation
  seo.ts                 JSON-LD
```
=======
## 🚀 What can you do with Curl2Code?
>>>>>>> 21969763dd23bccde1aacf59875f738482a9b48e

### cURL & HTTP

- **cURL to Code** — Convert cURL commands into code
- **cURL to JavaScript**
- **cURL to TypeScript**
- **cURL to Python**
- **cURL to Node.js**
- **cURL to Axios**
- **cURL to Go**
- **cURL to Java**
- **cURL to PHP**
- **cURL to C#**
- **cURL to Ruby**
- HTTP Request Builder
- HTTP Header Parser
- HTTP Response Formatter
- HTTP Status Codes
- URL Parser
- Query String Parser

### JSON

- JSON Formatter
- JSON Validator
- JSON Diff
- JSON to TypeScript
- JSON to Zod
- JSON to Pydantic

### Webhooks & Security

- Webhook Tester
- Webhook Payload Formatter
- Webhook Signature Generator
- HMAC Generator
- JWT Decoder
- JWT Expiry Checker
- Basic Auth Generator

### Other Developer Utilities

- Base64 Encoder / Decoder
- URL Encoder / Decoder
- UUID Generator
- Regex Tester
- Timestamp Converter
- Cron Expression Generator

Explore all available tools:

👉 **[Browse Curl2Code Tools](https://curl2code.xyz/tools)**

---

<<<<<<< HEAD
- `NEXT_PUBLIC_SITE_URL` sets canonical URLs and the sitemap. It defaults to the production
  domain, so set it when running anywhere else.
- Tool pages are prerendered at build time. Webhook Inspector requires the Node/Next.js runtime
  for `/api/webhook`; a static-only deployment cannot run the inspector.
- The tool registry is imported by the client component, so tool page content ships in the
  page bundle. If that ever matters, move `docs` and `faqs` out of the tool objects into a
  map the page imports on its own — nothing else needs to change.
- If a chunk 404s locally, you rebuilt while `next start` was running. Restart it.

## PowerShell and Webhook Inspector

PowerShell cURL arguments are tokenized in `lib/curl/powershell.ts`, then passed to the shared
`parseCurlTokens` HTTP parser and existing generators. This supports literal DevTools-style cURL,
and browser-generated Invoke-WebRequest sessions, cookies, headers and literal bodies. Arbitrary scripts and expressions are never evaluated. Windows PowerShell 5.1 users
should execute native commands as `curl.exe` to avoid its `curl` alias.

Webhook Inspector assigns one URL automatically per browser. An HttpOnly, SameSite cookie scoped
to `/api/webhook/session` stores a private random viewing key. It is not sent to capture URLs.
Redis stores its hash. Session initialization is idempotent and concurrent tabs reuse the same URL.
Browser Web Locks serialize the first cookie initialization where available. Clearing cookies,
using a different browser/profile, or private browsing creates a separate identity.

- `POST /api/webhook/session`: initialize or restore this browser's session; no create button.
- `GET /api/webhook/session?token=UUID&page=1`: privately list requests using the cookie.
- `/api/webhook/UUID[/optional/path]`: Next.js receives GET, POST, PUT, PATCH, DELETE, HEAD or
  OPTIONS. CORS preflights return 204 without being captured. Capture responses never echo input.

Each capture window expires after one hour. Reloads, reads and writes do not renew the TTL.
The inspector automatically opens a new window at the same browser URL after expiry. Redis scripts
atomically enforce the 100-request window limit, private reads and session reuse. New windows are
limited to 10 per minute across the deployment; restoring an existing window does not consume the
limit. Bodies are capped at 1 MiB including chunked uploads. Auto-refresh polls every five seconds
while visible and pauses on errors. Binary bodies are shown as base64; raw HTTP is reconstructed
from the server runtime's fields. Proxy-reported IPs are informational only.

The inspector returns HTTP 503 if Redis is missing/unavailable. `WEBHOOK_REDIS_PREFIX` can isolate
environments sharing a standalone Redis instance. Data TTL does not erase external backups; the
included Docker setup disables persistence entirely.

## Verification

```sh
npx playwright install chromium  # once for local browser testing
make test                       # examples, converters, SEO and responsive page checks
npm run lint
```

For Redis integration tests, use a reachable disposable Redis address:

```sh
TEST_REDIS_URL=redis://127.0.0.1:6379 npm test
```

The suite uses isolated key prefixes and never flushes Redis. Without `TEST_REDIS_URL`, storage
integration tests are explicitly skipped. The suite also checks all tool example outputs and
page rendering, both PowerShell dropdowns, session reuse across tabs/reloads, real webhook capture,
TTL expiry, body limits, metadata, sitemap entries and mobile overflow.
=======
## ⚡ cURL to Code

Paste a cURL command and instantly generate equivalent code.

### Example

**Input**

```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Aman"}'
>>>>>>> 21969763dd23bccde1aacf59875f738482a9b48e
