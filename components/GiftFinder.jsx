import Link from "next/link";
import GiftBrowser from "./GiftBrowser";

export default function GiftFinder() {
  return <div className="gift-finder gift-link-page stack">
    <p className="eyebrow">The Hatpull gift finder</p>
    <h1>Find a gift they’ll love.</h1>
    <GiftBrowser/>
    <Link href="/my" className="link">Back to my wish lists →</Link>
  </div>;
}
