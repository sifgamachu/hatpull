import Link from "next/link";
import GiftBrowser from "./GiftBrowser";

export default function GiftFinder() {
  return <div className="gift-finder gift-link-page stack">
    <p className="eyebrow">The Hatpull gift finder</p>
    <h1>Find a gift they’ll love.</h1>
    <GiftBrowser/>
    <details className="gift-sharing" id="sharing-rules">
      <summary>Sharing by text or social media</summary>
      <div className="stack">
        <p>Share Hatpull to introduce the gift-exchange tool or invite people to a celebration. The rules below concern Amazon Associates promoting commission-earning shopping links.</p>
        <ul>
          <li><strong>SMS and direct messages:</strong> Amazon permits affiliate links when recipients have opted in to receive those messages. A phone number alone is not permission. Associates must also follow applicable messaging laws. <a href="https://affiliate-program.amazon.com/help/operating/policies" target="_blank" rel="noopener noreferrer">Amazon’s messaging rules, section 4 ↗</a></li>
          <li><strong>Social media:</strong> Associates must list the exact URLs of eligible public profiles or groups in their account. Amazon accepts YouTube, Instagram, TikTok, X, Twitch and qualifying public Facebook Pages/open groups; personal Facebook profiles and private groups are not eligible affiliate sites. Follow the platform’s and group’s posting rules too. <a href="https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM" target="_blank" rel="noopener noreferrer">Amazon’s social-media requirements ↗</a></li>
          <li><strong>Disclosure:</strong> Clearly label affiliate links with “#ad” or “(paid link)” nearby. Associates must also identify their affiliate relationship on their website or social account: “As an Amazon Associate I earn from qualifying purchases.” <a href="https://affiliate-program.amazon.com/help/node/topic/GPXFHVYZMTGPUMPE" target="_blank" rel="noopener noreferrer">Amazon’s disclosure guidance ↗</a></li>
          <li><strong>Personal purchases and support requests:</strong> Associates must not buy through their own links or ask friends, relatives, employees, contractors or business contacts to purchase through them—even purchases already planned. Sending people through a website does not remove that restriction. Do not ask people to shop through affiliate links to support the Associate or help secure approval. <a href="https://affiliate-program.amazon.com/help/operating/policies" target="_blank" rel="noopener noreferrer">Participation rules, section 6(u) ↗</a> · <a href="https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM" target="_blank" rel="noopener noreferrer">Support-request guidance ↗</a></li>
        </ul>
        <p className="tiny muted">US Amazon Associates guidance · checked October 22, 2026. Consult the linked policies for the current requirements.</p>
      </div>
    </details>
    <Link href="/my" className="link">Back to my wish lists →</Link>
  </div>;
}
