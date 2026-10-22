import { headers } from "next/headers";
export default function robots() {
  const host = (headers().get("host") || "secretsantageneratorapp.com").replace(/^www\./, "");
  const publicHost = ["secretsantageneratorapp.com", "onlinenamepickertool.com"].includes(host);
  if (!publicHost) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: ["*", "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot"], allow: "/", disallow: ["/g/", "/join/", "/invite/", "/my", "/api/", "/account", "/auth/", "/unsubscribe"] }],
    sitemap: `https://${host}/sitemap.xml`,
  };
}
