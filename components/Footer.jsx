import Link from "next/link";
import Garland from "./Garland";
import { AMAZON_DISCLOSURE } from "@/lib/core";
import { LANDINGS } from "@/lib/landings";
export default function Footer() {
  return (
    <footer>
      <Garland />
      <span className="f-n">Hatpull · draw names, share wish lists, keep the surprise.</span>
      <span className="f-x">Hatpull · Merry Christmas and happy gifting 🎄</span>
      <div className="footer-links">
        <Link href="/secret-santa-generator">Secret Santa Generator</Link>
        <Link href="/name-picker">Online Name Picker</Link>
        <Link href="/gift-finder">Gift Finder</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/network-access">Network help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <div className="footer-links more">
        {LANDINGS.map(l => <Link key={l.slug} href={`/${l.slug}`}>{l.nav}</Link>)}
      </div>
      <div className="tiny" style={{ marginTop: 8 }}>{AMAZON_DISCLOSURE}</div>
      <div className="tiny" style={{ marginTop: 4 }}>© {new Date().getFullYear()} Hatpull, a Teregna product.</div>
    </footer>
  );
}
