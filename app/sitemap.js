import { headers } from "next/headers";
export default function sitemap() {
  const host = (headers().get("host") || "secretsantageneratorapp.com").replace(/^www\./, "");
  const base = `https://${host}`, now = new Date();
  const santa = host.includes("secretsanta");
  const paths = santa
    ? ["", "/new", "/name-picker", "/gift-finder", "/how-it-works", "/faq", "/about", "/contact", "/privacy", "/terms"]
    : ["", "/secret-santa-generator", "/gift-finder", "/how-it-works", "/faq", "/about", "/contact", "/privacy", "/terms"];
  return paths.map(p => ({ url: base + p, lastModified: now, changeFrequency: p === "" ? "weekly" : "monthly", priority: p === "" ? 1 : 0.6 }));
}
