import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  metadataBase: new URL("https://hollowmetric.com"),
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
        url: "/social-preview.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hollow Metric",
    description:
      "Launch budget and break-even planning for indie game developers and small teams.",
    images: ["/social-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/favicon.ico" }],
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
        {children}
        <CookieConsentBanner />
        <Analytics />
      </body>
    </html>
  );
}
