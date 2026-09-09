import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What curl2code does with your data: the tools run in your browser and your input is never transmitted. Hosting, analytics and cookies explained.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <div className="prose mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold text-fg">Privacy policy</h1>

      <h2>What you paste into a tool</h2>
      <p>
        It stays in your browser. Every tool is JavaScript running in your tab, so cURL commands,
        JWTs, JSON payloads, secrets and headers are processed on your own machine and are never
        sent to this site. Nothing is stored, and there is no account to store it against.
      </p>
      <p>
        The single exception is the <Link href="/tools/webhook-tester">webhook tester</Link>, whose
        purpose is to send an HTTP request. Your browser sends it directly to the URL you enter; it
        does not pass through this site, and neither the request nor the response is recorded here.
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
        The site sets no cookies of its own. Analytics, when enabled, sets its own to count returning
        visitors.
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
