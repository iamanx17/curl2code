import { createHash, randomBytes } from "node:crypto";
import { createClient } from "redis";
import { WEBHOOK_EXPIRY, type CapturedRequest, type RequestPage } from "../webhook";
import { WebhookError } from "./webhook-capture";

const makeClient = () => createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: false }, disableOfflineQueue: true });
type Client = ReturnType<typeof makeClient>;
const state = globalThis as typeof globalThis & { webhookRedis?: Promise<Client> };
const prefix = () => process.env.WEBHOOK_REDIS_PREFIX || "curl2code:webhook";
const keys = (token: string) => [`${prefix()}:{${token}}:session`, `${prefix()}:{${token}}:requests`];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function redis() {
  if (!process.env.REDIS_URL) throw new WebhookError("Webhook storage is not configured. Set REDIS_URL on the server.", 503);
  if (!state.webhookRedis) {
    const client = makeClient();
    // Never log connection strings or request data. Failed commands become HTTP 503.
    client.on("error", () => {});
    state.webhookRedis = client.connect().then(() => client).catch(error => {
      state.webhookRedis = undefined;
      throw error;
    });
  }
  const client = await state.webhookRedis;
  if (!client.isReady) { state.webhookRedis = undefined; throw new WebhookError("Webhook storage is unavailable. Try again shortly.", 503); }
  return client;
}

export async function createSession(readToken = randomBytes(32).toString("hex")) {
  const client = await redis();
  const id = hash(`capture:${readToken}`).slice(0, 32);
  const token = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  // Reuse does not consume the creation limit or extend the fixed capture window.
  // A single Redis script also prevents concurrent tabs creating duplicate sessions.
  const result = await client.eval(`
    local ttl = redis.call('PTTL', KEYS[1])
    if ttl > 0 then return {ttl, 0} end
    local count = redis.call('INCR', KEYS[3])
    if count == 1 then redis.call('EXPIRE', KEYS[3], 60) end
    if count > 10 then return {-1, 0} end
    redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
    redis.call('DEL', KEYS[2])
    return {tonumber(ARGV[2]) * 1000, 1}
  `, { keys: [...keys(token), `${prefix()}:creations`], arguments: [hash(readToken), String(WEBHOOK_EXPIRY)] }) as number[];
  if (result[0] < 0) throw new WebhookError("Session creation limit reached. Try again in one minute.", 429);
  return { token, readToken, expiresAt: Date.now() + result[0], created: result[1] === 1 };
}

export async function sessionExists(token: string) {
  return Boolean(await (await redis()).exists(keys(token)[0]));
}

export async function saveRequest(token: string, request: CapturedRequest) {
  const result = await (await redis()).eval(`
    local ttl = redis.call('PTTL', KEYS[1])
    if ttl <= 0 then return -1 end
    if redis.call('LLEN', KEYS[2]) >= 100 then return -2 end
    redis.call('LPUSH', KEYS[2], ARGV[1])
    redis.call('PEXPIRE', KEYS[2], ttl)
    return 1
  `, { keys: keys(token), arguments: [JSON.stringify(request)] });
  if (result === -1) throw new WebhookError("This webhook has expired or is invalid.", 404);
  if (result === -2) throw new WebhookError("This session has reached its 100-request limit.", 429);
}

export async function listRequests(token: string, readToken: string, page: number): Promise<RequestPage> {
  const result = await (await redis()).eval(`
    local secret = redis.call('GET', KEYS[1])
    if not secret then return {-1} end
    if secret ~= ARGV[1] then return {-2} end
    local total = redis.call('LLEN', KEYS[2])
    local data = redis.call('LRANGE', KEYS[2], ARGV[2], ARGV[3])
    return {total, unpack(data)}
  `, { keys: keys(token), arguments: [hash(readToken), String((page - 1) * 50), String(page * 50 - 1)] }) as [number, ...string[]];
  if (result[0] === -1) throw new WebhookError("This webhook has expired or is invalid. Refresh to reconnect.", 404);
  if (result[0] === -2) throw new WebhookError("The viewing key for this session is invalid.", 403);
  return { total: result[0], data: result.slice(1).map(value => JSON.parse(String(value))), is_last_page: page * 50 >= result[0] };
}
