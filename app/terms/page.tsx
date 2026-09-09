import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms covering use of curl2code's free developer tools, including permitted use, warranty disclaimer and limitation of liability.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <div className="prose mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold text-fg">Terms of service</h1>

      <h2>Use of the site</h2>
      <p>
        The tools are free to use, for anything, including commercial work. There is no account and
        no quota. Do not attempt to disrupt the site for other people.
      </p>

      <h2>No warranty</h2>
      <p>
        The tools are provided as they are, without any warranty. Generated code, decoded tokens and
        conversions may be wrong or incomplete — read the output before you rely on it, and test
        generated code before running it against anything that matters.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, no liability is accepted for any loss or damage arising from
        use of the site or of anything it produces.
      </p>

      <h2>Changes</h2>
      <p>
        Tools may change or be removed at any time. Any URL that disappears will be pointed at the
        directory rather than left broken where that is practical.
      </p>
    </div>
  );
}
