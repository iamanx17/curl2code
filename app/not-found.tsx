import type { Metadata } from "next";
import Link from "next/link";

// Next already marks the not-found page noindex; this only names it
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-3xl font-bold">Page not found</h1>

      <p className="mt-3 text-dim">
        That URL does not exist. It may have moved when the site was reorganised.
      </p>

      <p className="mt-6 flex gap-3">
        <Link
          href="/tools"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
        >
          Browse all tools
        </Link>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent/50">
          Go home
        </Link>
      </p>
    </div>
  );
}
