import type { Metadata } from "next";

const PUBLIC_TITLE = "Hollow Metric | Launch planning for indie game developers";
const PUBLIC_DESCRIPTION =
  "Estimate launch budget, break-even copies, and profitability before you commit more money.";
const PUBLIC_URL = "https://www.hollowmetric.com/";
const PUBLIC_IMAGE_URL = "https://www.hollowmetric.com/og/hollowmetric-preview.png";

export const metadata: Metadata = {
  title: {
    absolute: PUBLIC_TITLE,
  },
  description: PUBLIC_DESCRIPTION,
  alternates: {
    canonical: "/landing",
  },
  openGraph: {
    type: "website",
    url: PUBLIC_URL,
    siteName: "Hollow Metric",
    title: PUBLIC_TITLE,
    description: PUBLIC_DESCRIPTION,
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

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
