import type { Metadata } from "next";
import Link from "next/link";
import { TOOL_COUNT } from "@/lib/tools";

export const metadata: Metadata = {
  title: "About — Who Builds These Tools and Why",
  description:
    "curl2code is an independent collection of browser-based developer tools for working with HTTP APIs. How it works and why it is free.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <div className="prose mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold text-fg">About curl2code</h1>

      <p>
        curl2code is a small collection of tools for people who work with HTTP APIs. It started as
        one thing — a converter that turns a cURL command into working code — and grew to cover the
        other lookups that interrupt the same work: reading a JWT, checking a status code,
        formatting a payload, generating an id. There are {TOOL_COUNT} of them now.
      </p>

      <h2>How it works</h2>
      <p>
        Every tool runs as JavaScript in your browser. There is no queue and no database, and
        nothing you paste is stored. When you paste a command containing a bearer token, that token
        is parsed by code running on your own machine. The one exception is the{" "}
        <Link href="/tools/webhook-tester">webhook tester</Link>, which exists to send a request —
        and it sends it directly from your browser to the URL you type, not through this site.
      </p>
      <p>
        A side effect of that design is that the tools keep working with the network off, and that
        pages load in a few kilobytes.
      </p>

      <h2>Why it is free</h2>
      <p>
        The site costs almost nothing to run. It is free to use, has no accounts and no limits.
        Advertising may be added later to cover the domain; if it is, it will sit around the content
        rather than in front of it, and the tools will not change.
      </p>

      <h2>Who makes it</h2>
      <p>
        curl2code is built and maintained by one developer as an independent side project. It is not
        a company. If something is wrong or missing,{" "}
        <Link href="/contact">tell me</Link> — bug reports about a command that converts incorrectly
        are the most useful kind of message, especially when they include the command.
      </p>

      <h2>What is next</h2>
      <p>
        New tools are added when they solve a problem I actually hit, not to fill a directory. If
        there is one you keep searching for, it is worth suggesting.
      </p>
    </div>
  );
}
