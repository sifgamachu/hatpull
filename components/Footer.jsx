import Link from "next/link";
import Garland from "./Garland";
import { AMAZON_DISCLOSURE, SITE } from "@/lib/core";
import { LANDINGS } from "@/lib/landings";
export default function Footer() {
  return (
    <footer>
      <Garland />
      <span className="f-n">Hatpull · draw names, share wish lists, keep the surprise.</span>
      <span className="f-x">Hatpull · Merry Christmas and happy gifting 🎄</span>
      <div className="footer-links">
        <Link href={SITE.santa + "/"}>Secret Santa Generator</Link>
        <Link href={SITE.picker + "/"}>Online Name Picker</Link>
        <Link href={SITE.picker + "/random-name-picker-guide"}>Name-picker guide</Link>
        <Link href={SITE.santa + "/gift-finder"}>Gift Finder</Link>
        <Link href={SITE.santa + "/how-it-works"}>How it works</Link>
        <Link href={SITE.santa + "/faq"}>FAQ</Link>
        <Link href={SITE.santa + "/about"}>About</Link>
        <Link href={SITE.santa + "/contact"}>Contact</Link>
        <Link href="/network-access">Network help</Link>
        <Link href={SITE.santa + "/privacy"}>Privacy</Link>
        <Link href={SITE.santa + "/terms"}>Terms</Link>
      </div>
      <div className="footer-links more">
        {LANDINGS.map(l => <Link key={l.slug} href={`${SITE.santa}/${l.slug}`}>{l.nav}</Link>)}
      </div>
      <div className="tiny" style={{ marginTop: 8 }}>{AMAZON_DISCLOSURE}</div>
      <div className="tiny" style={{ marginTop: 4 }}>© {new Date().getFullYear()} Hatpull, a Teregna product.</div>
    </footer>
  );
}
