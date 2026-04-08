import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    sitemap: "https://hollowmetric.com/sitemap.xml",
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
  };
}
