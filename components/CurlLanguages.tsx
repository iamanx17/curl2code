import Link from "next/link";
import { LANGUAGE_CONTENT } from "@/lib/tools/curl-content";

/** Links between the converter and its ten per-language pages. */
export function CurlLanguages({ slug }: { slug: string }) {
  return (
    <nav aria-label="Target languages" className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-0.5 text-faint">
        {slug === "curl-to-code" ? "Language guides:" : "Other languages:"}
      </span>

      {LANGUAGE_CONTENT.map((language) =>
        language.slug === slug ? (
          <span
            key={language.slug}
            aria-current="page"
            className="rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs text-accent"
          >
            {language.name}
          </span>
        ) : (
          <Link
            key={language.slug}
            href={`/tools/${language.slug}`}
            className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-dim transition-colors hover:border-accent/40 hover:text-fg"
          >
            {language.name}
          </Link>
        ),
      )}
    </nav>
  );
}
