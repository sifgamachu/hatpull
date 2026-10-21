"use client";
import { Analytics } from "@vercel/analytics/react";
// Page-view stats without private links: celebration ids, join codes and tokens are removed before sending.
export default function SiteAnalytics() {
  return <Analytics beforeSend={e => {
    try {
      const u = new URL(e.url);
      u.pathname = u.pathname.replace(/^\/(join|invite|g)\/[^/]+/, "/$1/[id]").replace(/\/w\/[^/]+/, "/w/[id]");
      u.search = "";
      return { ...e, url: u.toString() };
    } catch { return null; }
  }} />;
}
