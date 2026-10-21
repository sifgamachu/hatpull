import { headers } from "next/headers";
export default function robots() {
  const host = (headers().get("host") || "secretsantageneratorapp.com").replace(/^www\./, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/g/", "/join/", "/invite/", "/my", "/api/", "/account", "/auth/", "/unsubscribe"] }],
    sitemap: `https://${host}/sitemap.xml`,
  };
}
