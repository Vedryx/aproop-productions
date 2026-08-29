import type { MetadataRoute } from "next";

const BASE = "https://www.aproopproductions.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/be-the-producer`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
