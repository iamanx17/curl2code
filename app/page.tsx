import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/ToolCard";
import { TOOL_COUNT, getTool } from "@/lib/tools";
import { LANGUAGE_CONTENT } from "@/lib/tools/curl-content";

export const metadata: Metadata = {
  title: { absolute: "Convert cURL Commands to Code — curl2code" },
  description:
    "Paste a cURL command and convert it into JavaScript, Python, Node.js, Go, Java, PHP, C#, Ruby or Axios. Free, instant, and everything runs in your browser.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Convert cURL Commands to Code",
    description:
      "Paste a cURL command and get ready-to-use code in nine languages. Free and browser-based.",
    url: "/",
  },
};

const FEATURED = [
  "curl-to-code",
  "json-formatter",
  "jwt-decoder",
  "json-to-typescript",
  "regex-tester",
  "cron-expression-generator",
];

export default function Home() {
  const featured = FEATURED.map((slug) => getTool(slug)!);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">Convert cURL commands to code</h1>

        <p className="mt-4 text-dim">
          Paste the cURL command from an API&rsquo;s documentation and get the same request as
          working code in JavaScript, Python, Node.js, Go, Java, PHP, C#, Ruby or Axios. Headers,
          query parameters, JSON and form bodies, auth and file uploads are all converted for you.
        </p>

        <p className="mt-3 text-dim">
          Alongside the converter there are {TOOL_COUNT - 1} more tools for working with HTTP APIs:
          format and compare JSON, decode a JWT, test a regular expression, explain a cron
          schedule. No accounts, no limits, and nothing you paste is uploaded.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/tools/curl-to-code"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            Open the cURL converter
          </Link>
          <Link
            href="/tools"
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent/50"
          >
            Browse all tools
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Convert cURL to a specific language</h2>
        <p className="mb-4 max-w-3xl text-sm text-dim">
          Each page runs the same converter with that language selected, and explains the details
          that matter when you run the result &mdash; dependencies, error handling and timeouts.
        </p>
        <ul className="flex flex-wrap gap-2">
          {LANGUAGE_CONTENT.map((language) => (
            <li key={language.slug}>
              <Link
                href={`/tools/${language.slug}`}
                className="block rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-dim transition-colors hover:border-accent/40 hover:text-fg"
              >
                cURL to {language.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ["Paste the command", "Copy the cURL example straight out of the API docs, Postman, or your browser's network panel."],
            ["Pick a language", "Choose one of nine targets. The converter re-runs as you type, so there is nothing to submit."],
            ["Copy the code", "Take the generated request into your project, or download it as a file."],
          ].map(([title, body], index) => (
            <li key={title} className="rounded-xl border border-line bg-panel p-4">
              <span className="text-xs font-medium text-accent">Step {index + 1}</span>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-dim">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">Start here</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} featured={tool.slug === "curl-to-code"} />
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-3">
        <div>
          <h2 className="mb-2 font-semibold">API docs show cURL. Your project is not cURL.</h2>
          <p className="text-sm text-dim">
            Every quickstart is a cURL command, and turning it into a real request means
            transcribing headers and guessing how the body should be encoded. The converter does
            that for you and gets the details right, including the ones that only surface in
            production.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold">The small lookups add up.</h2>
          <p className="text-sm text-dim">
            Reading a JWT, checking what 422 means, formatting a payload from a ticket, generating
            an id. Each is trivial on its own and collectively a steady drain of attention. These
            are one page each and load instantly.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold">Pasting a token somewhere should not be a risk.</h2>
          <p className="text-sm text-dim">
            Most online converters send your input to a server. Here every tool is JavaScript
            running in your tab, so the command, the token and the payload stay on your machine.
            Open your network panel and check.
          </p>
        </div>
      </section>
    </div>
  );
}
