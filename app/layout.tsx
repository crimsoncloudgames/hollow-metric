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
  title: "Hollow Metric",
  description: "Steam store page audit tool for indie developers. Improve positioning, copy, and discoverability before launch.",
  icons: {
    icon: [{ url: "/HM%20Logo%20Icon.ico?v=3", type: "image/x-icon" }],
    shortcut: [{ url: "/HM%20Logo%20Icon.ico?v=3", type: "image/x-icon" }],
    apple: [{ url: "/HM%20Logo%20Icon.ico?v=3" }],
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
