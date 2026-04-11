import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.hollowmetric.com"),
  title: {
    default: "Hollow Metric",
    template: "%s | Hollow Metric",
  },
  description:
    "Launch budget and break-even planning for indie game developers and small teams.",
  applicationName: "Hollow Metric",
  openGraph: {
    type: "website",
    siteName: "Hollow Metric",
    title: "Hollow Metric",
    description:
      "Launch budget and break-even planning for indie game developers and small teams.",
    images: [
      {
        url: "/og/hollowmetric-preview.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hollow Metric",
    description:
      "Launch budget and break-even planning for indie game developers and small teams.",
    images: ["/og/hollowmetric-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-17444080606"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'AW-17444080606');`}
        </Script>
        {children}
        <CookieConsentBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
