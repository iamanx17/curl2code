import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CurlLanguages } from "@/components/CurlLanguages";
import { ToolCard } from "@/components/ToolCard";
import { ToolRunner } from "@/components/ToolRunner";
import { WebhookInspector } from "@/components/WebhookInspector";
import { TOOLS, getTool, relatedTools } from "@/lib/tools";
import { breadcrumbSchema, faqSchema, softwareSchema } from "@/lib/seo";
import type { Tool, ToolResult } from "@/lib/tools/types";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  if (!tool) return {};

  return {
    title: tool.title,
    description: tool.summary,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { title: tool.title, description: tool.summary, url: `/tools/${tool.slug}`, images: ["/og.png"] },
    twitter: { card: "summary_large_image", title: tool.title, description: tool.summary, images: ["/og.png"] },
  };
}

/**
 * Run the tool's example at build time so the output is part of the static
 * HTML. Manual tools are skipped because running them sends a real request.
 */
async function exampleResult(tool: Tool): Promise<ToolResult | undefined> {
  if (!tool.example || tool.manual) return undefined;

  try {
    return await tool.run({ ...tool.example });
  } catch {
    // a broken example must not take the whole page build down
    return undefined;
  }
}

export default async function ToolPage({ params }: Props) {
  const tool = getTool((await params).slug);
  if (!tool) notFound();

  const related = relatedTools(tool);
  const initial = await exampleResult(tool);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex gap-2 text-xs text-faint">
        <Link href="/" className="hover:text-fg">Home</Link>
        <span>/</span>
        <Link href="/tools" className="hover:text-fg">Tools</Link>
        <span>/</span>
        <span className="text-dim">{tool.name}</span>
      </nav>

      <header className="mb-6 max-w-3xl">
        <p className="text-xs font-medium tracking-wide text-accent uppercase">{tool.category}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{tool.name}</h1>
        <p className="mt-3 text-dim">{tool.description}</p>
      </header>

      {tool.category === "cURL" && tool.slug !== "powershell-to-code" && <CurlLanguages slug={tool.slug} />}

      {tool.slug === "webhook-inspector" ? <WebhookInspector /> : <ToolRunner key={tool.slug} slug={tool.slug} initial={initial} />}

      {tool.docs?.length ? (
        <div className="prose mt-12 max-w-3xl">
          {tool.docs.map((doc) => (
            <section key={doc.heading}>
              <h2>{doc.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: doc.html }} />
            </section>
          ))}
        </div>
      ) : null}

      {tool.faqs?.length ? (
        <div className="prose mt-10 max-w-3xl">
          <h2>Frequently asked questions</h2>
          {tool.faqs.map((faq) => (
            <div key={faq.q}>
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">Related tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((other) => (
            <ToolCard key={other.slug} tool={other} />
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            softwareSchema(tool),
            breadcrumbSchema(tool),
            ...(tool.faqs?.length ? [faqSchema(tool.faqs)] : []),
          ]),
        }}
      />
    </div>
  );
}
