export default function manifest() {
  return {
    name: "Hatpull: Secret Santa Generator", short_name: "Hatpull",
    description: "Draw names for Secret Santa, share wish lists and pick random names.",
    start_url: "/", display: "standalone", background_color: "#0F3328", theme_color: "#0F3328",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  };
}
