import { ogCard, OG_SIZE } from "@/lib/og";
export const size = OG_SIZE; export const contentType = "image/png"; export const alt = "Online name picker wheel";
export default function Image() {
  return ogCard({ festive: false, kicker: "Free · No sign-up", title: "Online Name Picker Wheel", sub: "Paste your names, spin the wheel, get a fair random winner.", site: "onlinenamepickertool.com" });
}
