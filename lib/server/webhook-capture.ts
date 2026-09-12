import { randomUUID } from "node:crypto";
import type { CapturedRequest } from "../webhook";

export const MAX_BODY_BYTES = 1024 * 1024;

export class WebhookError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Read a bounded body, including chunked requests without Content-Length. */
export async function captureRequest(request: Request): Promise<CapturedRequest> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    throw new WebhookError("Request bodies are limited to 1 MiB.", 413);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new WebhookError("Request bodies are limited to 1 MiB.", 413);
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const bytes = Buffer.concat(chunks);
  let content: string;
  let contentEncoding = "utf-8";
  try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { content = bytes.toString("base64"); contentEncoding = "base64"; }
  const query: Record<string, string[]> = {};
  new URL(request.url).searchParams.forEach((value, key) => {
    if (!Object.hasOwn(query, key)) Object.defineProperty(query, key, { value: [], enumerable: true });
    query[key].push(value);
  });
  const form: Record<string, string[]> = Object.create(null);
  const files: Record<string, { filename: string; size: number; type: string }[]> = Object.create(null);
  const contentType = request.headers.get("content-type") || "";
  let formError: string | undefined;
  if (/^(application\/x-www-form-urlencoded|multipart\/form-data)\b/i.test(contentType)) {
    try {
      const data = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
      data.forEach((value, key) => {
        if (typeof value === "string") (form[key] ??= []).push(value);
        else (files[key] ??= []).push({ filename: value.name, size: value.size, type: value.type });
      });
    } catch { formError = "Could not parse form fields; the original body is preserved."; }
  }
  const url = new URL(request.url);
  url.host = request.headers.get("host") || url.host;
  return {
    uuid: randomUUID(), method: request.method, url: url.href,
    created_at: new Date().toISOString(), headers: Object.fromEntries(request.headers),
    query, content, content_encoding: contentEncoding, size,
    request: form, files, ...(formError ? { form_error: formError } : {}),
    // Informational only: these headers are not trusted for access control or rate limits.
    ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || null,
  };
}
