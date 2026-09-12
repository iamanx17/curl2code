import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How curl2code handles local tool input, temporary webhook captures, hosting and analytics.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <div className="prose mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold text-fg">Privacy policy</h1>

      <h2>What you paste into a tool</h2>
      <p>
        Converters and formatters run in your browser, so cURL commands,
        JWTs, JSON payloads, secrets and headers are processed on your own machine and are never
        sent to this site. Nothing is stored, and there is no account to store it against.
      </p>
      <p>
        The <Link href="/tools/webhook-tester">webhook tester</Link> sends an HTTP request. Your browser sends it directly to the URL you enter; it
        does not pass through this site, and neither the request nor the response is recorded here.
      </p>

      <p>
        The <Link href="/tools/webhook-inspector">webhook inspector</Link> creates a public,
        temporary URL on curl2code. Requests sent there are stored in Redis with a one-hour TTL.
        The session and captured requests become unavailable and expire automatically after that hour;
        refreshing does not extend it. A private browser cookie restores the same URL across tabs
        and reloads and authorizes viewing. Clearing it creates a separate browser session. Redis persistence
        and backup retention depend on the hosting configuration. Use test data.
      </p>

      <h2>Analytics</h2>
      <p>
        If analytics is enabled, page views and a small number of interaction events are recorded —
        which tool was opened, and whether the copy, download or example button was used. Events
        carry the name of the tool and nothing else. The content of any field is never included.
        Advertising signals and cross-site personalisation are switched off.
      </p>

      <h2>Cookies</h2>
      <p>
        The webhook inspector sets an essential HttpOnly cookie lasting up to one year to reuse
        your URL and protect captured requests. Request data still expires after one hour.
        Analytics, when enabled, sets separate cookies to count returning visitors.
      </p>

      <h2>Hosting</h2>
      <p>
        Pages are served over HTTPS. Like any web server, the host processes the request needed to
        deliver a page, which includes your IP address and browser user agent.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about any of this: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </div>
  );
}
