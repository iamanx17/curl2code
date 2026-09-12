"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cookiesOf, formatBody, rawRequest, type RequestPage } from "../lib/webhook";
import { track } from "../lib/analytics";

const button = "rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm hover:border-accent/50 disabled:opacity-50";
const code = "max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs";
type Session = { token: string; url: string; expiresAt: number };
let pendingSession: Promise<Session> | undefined;
function browserSession() {
  if (!pendingSession) {
    const connect = async () => {
      const response = await fetch("/api/webhook/session", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not connect to your webhook.");
      return result as Session;
    };
    // Serialize first visits across tabs; subsequent calls reuse the server-side cookie.
    pendingSession = (async () => navigator.locks ? await navigator.locks.request("curl2code-webhook", connect) : await connect())()
      .finally(() => { pendingSession = undefined; });
  }
  return pendingSession;
}
const emptyPage: RequestPage = { data: [], total: 0, is_last_page: true };

export function WebhookInspector() {
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [requests, setRequests] = useState<RequestPage>(emptyPage);
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(1);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("Details");
  const [pretty, setPretty] = useState(true);
  const [updated, setUpdated] = useState("");
  const active = useRef<AbortController | null>(null);
  const reconnecting = useRef(false);
  const item = requests.data.find(request => request.uuid === selected);

  useEffect(() => {
    track("tool_opened", { tool: "webhook-inspector" });
    return () => active.current?.abort();
  }, []);

  const load = useCallback(async (current: Session, nextPage: number) => {
    if (active.current) return;
    if (Date.now() >= current.expiresAt) {
      setSession(null); setAttempt(value => value + 1); return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/webhook/session?token=${current.token}&page=${nextPage}`, { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (response.status === 404 && !reconnecting.current) { reconnecting.current = true; setSession(null); setAttempt(value => value + 1); return; }
      if (!response.ok) throw new Error(result.error || "Could not refresh requests.");
      reconnecting.current = false;
      if (controller.signal.aborted) return;
      const data = result as RequestPage;
      setRequests(data); setPage(nextPage);
      setSelected(previous => data.data.some(request => request.uuid === previous) ? previous : data.data[0]?.uuid ?? "");
      setUpdated(new Date().toLocaleTimeString());
    } catch (cause) {
      if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Could not refresh requests."); setAuto(false); }
    } finally {
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }, []);

  useEffect(() => {
    if (!session || !auto) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(session, page);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [session, auto, page, load]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError("");
    browserSession().then(result => {
      if (cancelled) return;
      setSession(result); setPage(1); setRequests(emptyPage); setSelected(""); setAuto(true);
      void load(result, 1);
    }).catch(cause => {
      if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not connect."); setAuto(false); setBusy(false); }
    });
    return () => { cancelled = true; };
  }, [attempt, load]);

  const testCommand = session ? `curl -X POST '${session.url.replace(/'/g, "'\\''")}' -H 'Content-Type: application/json' --data '{"message":"Hello webhook"}'` : "";

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); }
    catch { setNotice("Copy failed. Select the text and copy it manually."); }
  }

  const sections = item ? [
    ["Method", item.method], ["URL", item.url], ["Received (UTC)", item.created_at],
    ["Headers", item.headers ?? {}], ["Query parameters", item.query ?? {}],
    ["Cookies", cookiesOf(item)], ["Reported IP (proxy header)", item.ip], ["Size (bytes)", item.size],
    ["Form fields", item.request ?? {}], ["Files", item.files ?? {}],
  ] : [];

  return (
    <section className="rounded-xl border border-line bg-panel p-4 sm:p-5" aria-label="Webhook session">
      <p className="mb-4 text-sm text-dim">Temporary endpoint · expires in one hour · up to 100 requests · 1 MiB per body. Your browser reuses one URL across tabs and reloads. Requests are captured by curl2code.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className={button} disabled={busy} onClick={() => session ? load(session, page) : setAttempt(value => value + 1)}>{busy && !session ? "Connecting…" : "Refresh"}</button>
        {session && <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} />Auto-refresh (5s)</label></>}
        {busy && session && <span role="status" className="text-sm text-dim">Loading…</span>}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
      <p role="status" className="mt-2 text-sm text-dim">{notice}</p>
      {session ? <>
        <label className="mt-4 block text-sm font-medium" htmlFor="webhook-url">Your webhook URL</label>
        <div className="mt-2 flex gap-2"><input id="webhook-url" readOnly value={session.url} className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm" onFocus={event => event.target.select()} /><button className={button} onClick={() => copy(session.url, "URL")}>Copy URL</button></div>
        <p className="mt-2 text-xs text-dim">Expires {new Date(session.expiresAt).toLocaleTimeString()}. Captured data expires after one hour. This browser reconnects automatically when the session expires.</p>
        <details className="mt-3 rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm">Test from your terminal</summary>
          <p className="my-2 text-xs text-dim">Run this command in Bash or zsh to send a sample request.</p>
          <pre className={code}>{testCommand}</pre>
          <button className={`${button} mt-2`} onClick={() => copy(testCommand, "Test command")}>Copy test command</button>
        </details>
        <p className="my-4 text-sm" aria-live="polite">{requests.total} {requests.total === 1 ? "request" : "requests"}{updated && <span className="text-dim"> · Last refreshed {updated}</span>}</p>
        {!requests.data.length ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-dim">{requests.total ? "No requests on this page. Go to the previous page or refresh." : "Waiting for requests… Send a request to your webhook URL."}</p> :
          <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="max-h-[640px] space-y-2 overflow-auto" aria-label="Received requests">{requests.data.map(request => <button key={request.uuid} aria-pressed={request.uuid === selected} onClick={() => setSelected(request.uuid)} className={`block w-full rounded-lg border p-3 text-left text-sm ${request.uuid === selected ? "border-accent bg-panel-2" : "border-line"}`}>
              <strong>{request.method ?? "Request"}</strong><span className="mt-1 block text-xs text-dim">{request.created_at}</span><span className="mt-1 block truncate text-xs text-dim">{request.url}</span>
            </button>)}</div>
            {item && <div className="min-w-0">
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Request views">{["Details", "Body", "Raw request", "All metadata"].map(tab => <button className={`${button} ${view === tab ? "border-accent text-accent" : ""}`} key={tab} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab}</button>)}</div>
              {view === "Details" && <dl className="space-y-3">{sections.map(([label, value]) => <div key={String(label)}><dt className="mb-1 text-sm font-medium">{String(label)}</dt><dd><pre className={code}>{value == null ? "Not available" : typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre></dd></div>)}</dl>}
              {view === "Body" && <>{item.content_encoding === "base64" && <p className="mb-2 text-sm text-dim">Binary body, shown as base64.</p>}<label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={pretty} onChange={event => setPretty(event.target.checked)} />Format JSON</label><pre className={code}>{item.content ? formatBody(item.content, pretty) : "Empty body"}</pre></>}
              {view === "Raw request" && <><p className="mb-2 text-xs text-dim">Reconstructed from captured fields; header casing and ordering reflect the server runtime. Binary bodies are shown as base64.</p><pre className={code}>{rawRequest(item)}</pre></>}
              {view === "All metadata" && <pre className={code}>{JSON.stringify(item, null, 2)}</pre>}
            </div>}
          </div>}
        <div className="mt-4 flex items-center gap-3"><button className={button} disabled={busy || page === 1} onClick={() => load(session, page - 1)}>Previous</button><span className="text-sm">Page {page}</span><button className={button} disabled={busy || requests.is_last_page} onClick={() => load(session, page + 1)}>Next</button></div>
      </> : <p className="py-8 text-center text-dim">Your webhook URL appears automatically. If the connection fails, use Refresh to retry.</p>}
    </section>
  );
}
