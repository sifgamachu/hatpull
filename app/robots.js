import { headers } from "next/headers";
export default async function robots() {
  const host = ((await headers()).get("host") || "hatpull.com").replace(/^www\./, "");
  const publicHost = ["hatpull.com", "onlinenamepickertool.com"].includes(host);
  if (!publicHost) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: ["*", "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot"], allow: "/", disallow: ["/g/", "/join/", "/invite/", "/my", "/api/", "/account", "/auth/", "/unsubscribe", "/share-gift"] }],
    sitemap: `https://${host}/sitemap.xml`,
  };
}
