import { ogCard, OG_SIZE } from "@/lib/og";
export const size = OG_SIZE; export const contentType = "image/png"; export const alt = "Free Secret Santa generator";
export default function Image() {
  return ogCard({ kicker: "Free Secret Santa generator", title: "Draw names online. Share wish lists.", sub: "One link for the whole group. Nobody draws themselves. Easy invitations.", site: "hatpull.com" });
}
