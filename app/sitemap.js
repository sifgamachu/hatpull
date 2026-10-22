import { headers } from "next/headers";
import { LANDINGS } from "@/lib/landings";
export default async function sitemap() {
  const host = ((await headers()).get("host") || "secretsantageneratorapp.com").replace(/^www\./, "");
  const base = host === "onlinenamepickertool.com" ? "https://onlinenamepickertool.com" : "https://secretsantageneratorapp.com";
  const santa = host !== "onlinenamepickertool.com";
  const paths = santa
    ? ["", "/gift-finder", "/how-it-works", "/faq", "/about", "/contact", "/privacy", "/terms", "/network-access"]
    : ["", "/network-access"]; // Keep connection help available on either site.
  const all = santa ? [...paths, ...LANDINGS.map(l => `/${l.slug}`)] : paths;
  return all.map(p => ({ url: base + p, changeFrequency: p === "" ? "weekly" : "monthly", priority: p === "" ? 1 : LANDINGS.some(l => `/${l.slug}` === p) ? 0.8 : 0.6 }));
}
