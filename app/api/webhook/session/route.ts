import { randomBytes } from "node:crypto";
import { isToken } from "../../../../lib/webhook";
import { createSession, listRequests } from "../../../../lib/server/webhook-store";
import { WebhookError } from "../../../../lib/server/webhook-capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "webhook_browser";
const cookieKey = (request: Request) => request.headers.get("cookie")?.split(";").map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
const headers = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
function failure(error: unknown) {
  return json({ error: error instanceof WebhookError ? error.message : "Webhook storage is unavailable. Try again shortly." }, error instanceof WebhookError ? error.status : 503);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  // Next.js can use its internal hostname in request.url; Host is the browser-facing host.
  requestUrl.host = request.headers.get("host") || requestUrl.host;
  let sameHost = !origin;
  try { if (origin) sameHost = new URL(origin).host === requestUrl.host; } catch { /* Invalid origin. */ }
  if (!sameHost || request.headers.get("sec-fetch-site") === "cross-site" || !request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Use the inspector on this site to generate a URL." }, 403);
  }
  const stored = cookieKey(request);
  const readToken = stored && /^[a-f0-9]{64}$/.test(stored) ? stored : randomBytes(32).toString("hex");
  let response: Response;
  try {
    const session = await createSession(readToken);
    response = json({ token: session.token, expiresAt: session.expiresAt, url: new URL(`/api/webhook/${session.token}`, origin || requestUrl.origin).href }, session.created ? 201 : 200);
  } catch (error) { response = failure(error); }
  const secure = (origin || requestUrl.origin).startsWith("https:") ? "; Secure" : "";
  response.headers.set("Set-Cookie", `${COOKIE}=${readToken}; Path=/api/webhook/session; HttpOnly; SameSite=Strict; Max-Age=31536000${secure}`);
  return response;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token") ?? "";
  const page = params.get("page") ?? "1";
  if (!isToken(token) || !/^[12]$/.test(page)) return json({ error: "Invalid webhook token or page." }, 400);
  const readToken = cookieKey(request) ?? "";
  if (!/^[a-f0-9]{64}$/.test(readToken)) return json({ error: "Your browser session is missing. Refresh to reconnect." }, 403);
  try { return json(await listRequests(token, readToken, Number(page))); }
  catch (error) { return failure(error); }
}
