import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Report a Bug or Suggest a Tool",
  description:
    "Get in touch about a conversion bug, a tool suggestion, or a privacy question. Email reaches the developer who maintains curl2code.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <div className="prose mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold text-fg">Contact</h1>

      <p>Email is the only channel, and it reaches the person who builds the site.</p>

      <p>
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </p>

      <h2>What is useful to include</h2>
      <ul className="list">
        <li>
          <strong>A conversion bug.</strong> Send the exact input and which tool you used. A command
          that produces wrong code is the most valuable report there is.
        </li>
        <li>
          <strong>A tool suggestion.</strong> Describe the problem rather than the tool — what were
          you trying to do when you went looking?
        </li>
        <li>
          <strong>Something broken.</strong> Which browser, and what you saw.
        </li>
      </ul>

      <p>
        Please remove real tokens and customer data before sending anything. A redacted example
        reproduces the bug just as well.
      </p>
    </div>
  );
}
