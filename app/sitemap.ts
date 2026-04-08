import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://hollowmetric.com";
  const lastModified = new Date();

  return [
    { url: `${baseUrl}/landing`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/resources`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/refunds`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/cookies`, lastModified, changeFrequency: "yearly", priority: 0.4 },
  ];
}