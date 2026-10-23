import { headers } from 'next/headers';
export default async function manifest() {
  const picker = ((await headers()).get('host') || '').replace(/^www\./, '').split(':')[0] === 'onlinenamepickertool.com';
  return {
    name: "Hatpull: Secret Santa Generator", short_name: "Hatpull",
    description: "Draw names for Secret Santa, share wish lists and pick random names.",
    start_url: "/", display: "standalone", background_color: "#0F3328", theme_color: "#0F3328",
    id: "/", scope: "/",
    ...(!picker ? { share_target: { action: "/share-gift", method: "GET", params: { title: "title", text: "text", url: "url" } } } : {}),
    icons: [{ src: "/icons/hatpull-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icons/hatpull-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
