import { headers } from "next/headers";
import { LANDINGS } from "@/lib/landings";
export default function sitemap() {
  const host = (headers().get("host") || "secretsantageneratorapp.com").replace(/^www\./, "");
  const base = host === "onlinenamepickertool.com" ? "https://onlinenamepickertool.com" : "https://secretsantageneratorapp.com";
  const santa = host !== "onlinenamepickertool.com";
  const paths = santa
    ? ["", "/gift-finder", "/how-it-works", "/faq", "/about", "/contact", "/privacy", "/terms"]
    : [""]; // the picker domain only has its home page; everything else lives on the Secret Santa domain
  const all = santa ? [...paths, ...LANDINGS.map(l => `/${l.slug}`)] : paths;
  return all.map(p => ({ url: base + p, changeFrequency: p === "" ? "weekly" : "monthly", priority: p === "" ? 1 : LANDINGS.some(l => `/${l.slug}` === p) ? 0.8 : 0.6 }));
}
