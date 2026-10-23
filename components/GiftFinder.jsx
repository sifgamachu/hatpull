"use client";
import Link from "next/link";
import GiftBrowser from "./GiftBrowser";
import GiftArtwork from "./GiftArtwork";
export default function GiftFinder() {
  return <div className="gift-finder stack"><section className="gift-hero"><div><p className="eyebrow">The Hatpull gift edit</p><h1>Good gifts.<br/><em>Great little hints.</em></h1><p>Find something they’ll love—or pick a few favorites for your own wish list. Thoughtful choices, within your budget.</p><div className="row"><span className="gift-feature">♡ Save your favorites</span><span className="gift-feature">✓ Keep the surprise</span><Link href="/my" className="link">My wish lists →</Link></div></div><div className="gift-hero-art"><GiftArtwork/><span className="gift-hero-stamp">a little wish<br/><b>a lovely surprise</b></span></div></section><GiftBrowser/></div>;
}
