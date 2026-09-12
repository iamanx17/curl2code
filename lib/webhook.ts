export type CapturedRequest = {
  uuid: string;
  method?: string;
  url?: string;
  created_at?: string;
  headers?: Record<string, string | string[]>;
  query?: unknown;
  content?: string;
  [key: string]: unknown;
};

export type RequestPage = { data: CapturedRequest[]; total: number; is_last_page: boolean };
export const WEBHOOK_EXPIRY = 3600;
export const isToken = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function formatBody(content: string, pretty = true) {
  if (pretty) {
    try { return JSON.stringify(JSON.parse(content), null, 2); } catch { /* Plain text. */ }
  }
  return content;
}

export function cookiesOf(request: CapturedRequest) {
  return Object.entries(request.headers ?? {})
    .filter(([key]) => key.toLowerCase() === "cookie")
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .flatMap(value => value.split(";"))
    .map(value => value.trim()).filter(Boolean);
}

/** Reconstructed view: the API does not supply the original HTTP wire bytes. */
export function rawRequest(request: CapturedRequest) {
  const headers = Object.entries(request.headers ?? {}).flatMap(([name, value]) =>
    (Array.isArray(value) ? value : [value]).map(item => `${name}: ${item}`));
  return [`${request.method ?? "HTTP"} ${request.url ?? ""}`, ...headers, "", request.content ?? ""].join("\r\n");
}
