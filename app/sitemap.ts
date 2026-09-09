import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

/**
 * The build time is the closest honest answer for a fully static site: every
 * page is regenerated on deploy. Faking per-page dates only teaches crawlers
 * to distrust the field.
 */
const lastModified = new Date();

const PAGES = [
  { path: "", priority: 1 },
  { path: "/tools", priority: 0.9 },
  { path: "/about", priority: 0.5 },
  { path: "/contact", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map((page) => ({
      url: `${SITE.url}${page.path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: page.priority,
    })),
    ...TOOLS.map((tool) => ({
      url: `${SITE.url}/tools/${tool.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      // the cURL converter and its language pages are what the site is for
      priority: tool.category === "cURL" ? 0.9 : 0.7,
    })),
  ];
}
