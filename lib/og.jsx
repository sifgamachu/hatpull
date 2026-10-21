import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Shared share-card artwork: evergreen night for Christmas, cream for the rest.
export function ogCard({ kicker, title, sub, festive = true, site }) {
  const bg = festive ? "linear-gradient(160deg,#17493A 0%,#0F3328 55%,#0A251D 100%)" : "linear-gradient(160deg,#FBF6EC 0%,#F1E8D6 100%)";
  const ink = festive ? "#F7F2E7" : "#1E2B26", mute = festive ? "#C9D8CF" : "#5B6B64", accent = festive ? "#EDC25E" : "#C62F42";
  const bulbs = ["#D9384B", "#EDC25E", "#3E9A6B", "#4A8FE7", "#E26FB5", "#F08A3C"];
  const flakes = [[700, 70, 4], [960, 90, 7], [1110, 150, 5], [1040, 250, 4], [1130, 360, 6], [990, 420, 5], [1080, 470, 6], [1150, 560, 4]];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, padding: "70px 80px", position: "relative", fontFamily: "Georgia, serif" }}>
        {festive && (
          <div style={{ position: "absolute", top: 18, left: 0, right: 0, display: "flex", justifyContent: "space-around" }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ width: 18, height: 26, borderRadius: 13, background: bulbs[i % bulbs.length], boxShadow: `0 0 22px 6px ${bulbs[i % bulbs.length]}` }} />
            ))}
          </div>
        )}
        {festive && flakes.map(([x, y, r], i) => <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, background: "rgba(255,255,255,.75)" }} />)}
        <div style={{ display: "flex", flexDirection: "column", marginTop: festive ? 40 : 0 }}>
          <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: accent, fontFamily: "Arial, sans-serif", fontWeight: 700 }}>{kicker}</div>
          <div style={{ fontSize: title.length > 40 ? 68 : 82, lineHeight: 1.05, color: ink, marginTop: 18, maxWidth: 1000 }}>{title}</div>
          {sub && <div style={{ fontSize: 34, color: mute, marginTop: 22, maxWidth: 900, fontFamily: "Arial, sans-serif" }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 54, height: 40, borderRadius: "30px 30px 6px 6px", background: "#D9384B", position: "relative" }}>
              <div style={{ position: "absolute", bottom: -6, left: -6, width: 66, height: 14, borderRadius: 7, background: "#FFFFFF" }} />
            </div>
            <div style={{ fontSize: 36, color: ink }}>Hatpull</div>
          </div>
          <div style={{ fontSize: 28, color: mute, fontFamily: "Arial, sans-serif" }}>{site}</div>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
