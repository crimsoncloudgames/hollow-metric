import type { Metadata } from "next";
import LandingPage from "./landing/page";

const PUBLIC_TITLE = "Hollow Metric | Launch planning for indie game developers";
const PUBLIC_DESCRIPTION =
  "Launch planning, break-even modeling, and pricing analysis for indie developers making launch decisions.";
const PUBLIC_URL = "https://www.hollowmetric.com/";
const PUBLIC_IMAGE_URL = "https://www.hollowmetric.com/og/hollowmetric-preview.png";

export const metadata: Metadata = {
  title: {
    absolute: PUBLIC_TITLE,
  },
  description: PUBLIC_DESCRIPTION,
  alternates: {
    canonical: PUBLIC_URL,
  },
  openGraph: {
    title: PUBLIC_TITLE,
    description: PUBLIC_DESCRIPTION,
    url: PUBLIC_URL,
    siteName: "Hollow Metric",
    type: "website",
    images: [
      {
        url: PUBLIC_IMAGE_URL,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PUBLIC_TITLE,
    description: PUBLIC_DESCRIPTION,
    images: [PUBLIC_IMAGE_URL],
  },
};

export default function HomePage() {
  return <LandingPage />;
}