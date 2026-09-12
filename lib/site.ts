export const SITE = {
  name: "curl2code",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://curl2code.xyz",
  description:
    "Free developer tools that run in your browser: convert cURL to code, format JSON, decode JWTs, test regular expressions and more. Converters process input locally; webhook capture runs on our own backend.",
  email: "hello@curl2code.xyz",
};

export const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/tools/curl-to-code", label: "cURL → Code" },
  { href: "/tools/powershell-to-code", label: "PowerShell → Code" },
  { href: "/tools/webhook-inspector", label: "Webhook Inspector" },
  { href: "/about", label: "About" },
];

export const FOOTER = [
  { href: "/tools", label: "All tools" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export const CATEGORIES = [
  { name: "cURL", blurb: "Turn a request you already have into code you can run." },
  { name: "JSON", blurb: "Read, check, compare and generate types from JSON." },
  { name: "Auth", blurb: "Tokens, encodings and headers, decoded in your browser." },
  { name: "API", blurb: "Compose and inspect HTTP requests and responses." },
  { name: "Webhooks", blurb: "Inspect payloads, sign them and test your endpoint." },
  { name: "Utilities", blurb: "The small lookups that interrupt everything else." },
] as const;
