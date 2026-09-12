import Link from "next/link";
import { NAV, SITE } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-panel-2 focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="grid size-7 place-items-center rounded-[7px] bg-linear-135 from-accent to-accent-2 font-mono text-xs font-bold text-white">
            c2
          </span>
          <span className="tracking-tight">
            curl<span className="text-accent">2code</span>
          </span>
        </Link>

        <nav className="flex w-full flex-wrap items-center gap-1 text-sm md:ml-auto md:w-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-dim transition-colors hover:bg-panel hover:text-fg sm:px-3"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
