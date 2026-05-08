import type { Metadata } from "next";
import LandingPage from "./landing/page";
import { SITE_COPY } from "@/lib/site-copy";

export const dynamic = "force-static";
export const revalidate = false;

export const metadata: Metadata = {
  title: {
    absolute: SITE_COPY.title,
  },
  description: SITE_COPY.description,
  alternates: {
    canonical: SITE_COPY.url,
  },
  openGraph: {
    title: SITE_COPY.title,
    description: SITE_COPY.description,
    url: SITE_COPY.url,
    siteName: SITE_COPY.siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_COPY.title,
    description: SITE_COPY.description,
  },
};

export default function HomePage() {
  return <LandingPage />;
}