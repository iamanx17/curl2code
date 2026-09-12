import { isToken } from "../../../../../lib/webhook";
import { captureRequest, WebhookError } from "../../../../../lib/server/webhook-capture";
import { saveRequest, sessionExists } from "../../../../../lib/server/webhook-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string; path?: string[] }> };

async function capture(request: Request, context: Context) {
  const headers = new Headers({
    "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
  headers.set("Access-Control-Allow-Headers", request.headers.get("access-control-request-headers") || "Content-Type, Authorization");
  const reply = (message: string, status: number) => new Response(request.method === "HEAD" || status === 204 ? null : message, { status, headers });
  try {
    const { token } = await context.params;
    if (!isToken(token) || !await sessionExists(token)) return reply("This webhook has expired or is invalid.", 404);
    if (request.method === "OPTIONS" && request.headers.has("access-control-request-method")) return reply("", 204);
    const captured = await captureRequest(request);
    await saveRequest(token, captured);
    console.info("[webhook] captured", { method: request.method, bytes: captured.size });
    return reply("Received", 200);
  } catch (error) {
    return reply(error instanceof WebhookError ? error.message : "Webhook storage is unavailable. Try again shortly.", error instanceof WebhookError ? error.status : 503);
  }
}

export { capture as GET, capture as POST, capture as PUT, capture as PATCH, capture as DELETE, capture as HEAD, capture as OPTIONS };
