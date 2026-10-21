import { ogCard, OG_SIZE } from "@/lib/og";
import { LANDINGS, getLanding } from "@/lib/landings";
export const size = OG_SIZE; export const contentType = "image/png"; export const alt = "Hatpull";
export function generateStaticParams() { return LANDINGS.map(l => ({ slug: l.slug })); }
export default function Image({ params }) {
  const l = getLanding(params.slug);
  return ogCard({ festive: l.festive, kicker: l.kicker, title: l.title.replace(/\s*\(.*\)$/, ""), sub: l.lede.length > 110 ? null : l.lede, site: "secretsantageneratorapp.com" });
}
