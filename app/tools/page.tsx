import type { Metadata } from "next";
import { ToolDirectory } from "@/components/ToolDirectory";
import { CATEGORIES } from "@/lib/site";
import { TOOL_COUNT, toolsByCategory } from "@/lib/tools";

export const metadata: Metadata = {
  title: `All ${TOOL_COUNT} Developer Tools — cURL, JSON, JWT, HTTP`,
  description: `A directory of ${TOOL_COUNT} free developer tools: cURL to code conversion, JSON formatting and type generation, JWT decoding, encoding helpers, webhook utilities and more.`,
  alternates: { canonical: "/tools" },
};

export default function ToolsIndex() {
  const groups = CATEGORIES.map((category) => ({
    name: category.name,
    blurb: category.blurb,
    tools: toolsByCategory(category.name).map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      summary: tool.summary,
    })),
  })).filter((group) => group.tools.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">All developer tools</h1>
        <p className="mt-3 text-dim">
          {TOOL_COUNT} tools for working with HTTP APIs. Converters run locally without an account.
          Webhook capture runs on our backend with automatic expiry. The cURL converter has a page for every target language.
        </p>
      </header>

      <ToolDirectory groups={groups} />
    </div>
  );
}
