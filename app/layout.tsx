import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { GA_ID } from "@/lib/analytics";
import { websiteSchema } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Convert cURL Commands to Code — curl2code",
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" }, apple: "/icon-180.png" },
  openGraph: { siteName: SITE.name, type: "website", images: ["/og.png"], locale: "en_US" },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = { themeColor: "#0b0d12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
        />

        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true,allow_google_signals:false});`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
