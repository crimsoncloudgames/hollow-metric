import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hollow Metric",
  description:
    "Estimate launch costs, compare price points, and plan break-even targets before you ship.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Hollow Metric",
    description:
      "Estimate launch costs, compare price points, and plan break-even targets before you ship.",
    images: [
      {
        url: "/HM logo icon with text webP.webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hollow Metric",
    description:
      "Estimate launch costs, compare price points, and plan break-even targets before you ship.",
    images: ["/HM logo icon with text webP.webp"],
  },
};

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
