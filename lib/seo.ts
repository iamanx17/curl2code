import { SITE } from "./site";
import { Faq, Tool } from "./tools/types";

export const softwareSchema = (tool: Tool) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: tool.name,
  url: `${SITE.url}/tools/${tool.slug}`,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any browser",
  description: tool.summary,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
});

export const faqSchema = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
});

export const breadcrumbSchema = (tool: Tool) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE.url}/tools` },
    {
      "@type": "ListItem",
      position: 3,
      name: tool.name,
      item: `${SITE.url}/tools/${tool.slug}`,
    },
  ],
});

/** Site-level identity, rendered once on the homepage. */
export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
});
