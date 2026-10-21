import { headers } from "next/headers";
import { LANDINGS } from "@/lib/landings";
export default function sitemap() {
  const host = (headers().get("host") || "secretsantageneratorapp.com").replace(/^www\./, "");
  const base = `https://${host}`, now = new Date();
  const santa = host.includes("secretsanta");
  const paths = santa
    ? ["", "/new", "/name-picker", "/gift-finder", "/how-it-works", "/faq", "/about", "/contact", "/privacy", "/terms"]
    : ["", "/secret-santa-generator", "/gift-finder", "/how-it-works", "/faq", "/about", "/contact", "/privacy", "/terms"];
  const all = santa ? [...paths, ...LANDINGS.map(l => `/${l.slug}`)] : paths;
  return all.map(p => ({ url: base + p, lastModified: now, changeFrequency: p === "" ? "weekly" : "monthly", priority: p === "" ? 1 : LANDINGS.some(l => `/${l.slug}` === p) ? 0.8 : 0.6 }));
}
