import Link from "next/link";
import Festive from "@/components/Festive";
import Snow from "@/components/Snow";
import Lights from "@/components/Lights";
import SantaHat from "@/components/SantaHat";
import Countdown from "@/components/Countdown";
import { Bow } from "@/components/bits";
import { LANDINGS } from "@/lib/landings";
import { xmasYear, upcomingOccasions, fmtDate, daysUntil, XMAS_OCC } from "@/lib/core";

export const metadata = {
  title: { absolute: "Secret Santa Generator: Draw Names Online Free | Hatpull" },
  description: "Free Secret Santa generator. Add names, set exclusions for couples, share one invite link, and let everyone draw a name and make a wish list. No sign-up needed.",
  alternates: { canonical: "https://secretsantageneratorapp.com/" },
  openGraph: { title: "Secret Santa Generator: Draw Names Online Free", description: "Draw names, keep couples apart, share wish lists. Free and no sign-up.", url: "https://secretsantageneratorapp.com/", siteName: "Secret Santa Generator", type: "website" },
};
export const revalidate = 3600;

const FAQ = [
  ["How does the Secret Santa generator work?", "Enter the names in your group, add any exclusions, and share one invitation link. Each person opens it, picks their own name, and draws someone. Only they can see who they drew."],
  ["Can someone draw their own name?", "No. The generator never lets anyone draw themselves, so you never have to start over."],
  ["Can I stop couples from drawing each other?", "Yes. Add exclusions for couples, siblings, housemates, or anyone who drew each other last year."],
  ["Does everyone need an account?", "No. People join with the invitation link and pick their name. Nobody has to sign up or share an email address."],
  ["Can the organizer see who drew whom?", "Not while the exchange is running. The organizer can view the full results after the celebration date, so you can set exclusions to avoid the same matches next year."],
  ["How do wish lists work?", "Each person adds gift ideas with links and prices. Whoever drew them can secretly reserve a gift, so nobody buys the same thing twice."],
  ["Is it free?", "Yes. Drawing names, wish lists and invitations are all free."],
];

export default function SantaLanding() {
  const upcoming = upcomingOccasions().slice(0, 3);
  return (
    <div className="page">
      <Festive on />
      <section className="xmas" aria-label="Secret Santa generator">
        <Snow />
        <Lights n={14} />
        <div className="inner">
          <div>
            <p className="kicker">🎄 Secret Santa {xmasYear()}</p>
            <h1>Free Secret Santa generator. <em>Draw names online.</em></h1>
            <p className="lede">Add the family, keep the couples apart, share one link. Everyone draws a name, writes a wish list, and nobody buys the same gift twice.</p>
            <div className="row" style={{ marginTop: 24 }}>
              <Link className="btn" href="/new?occ=0">Start drawing names</Link>
              <Link className="btn ghost" href="/new?mode=wish">Share wish lists</Link>
            </div>
            <Countdown />
          </div>
          <SantaHat />
        </div>
      </section>

      <section className="section" id="how">
        <h2>How it works</h2>
        <div className="how">
          <div><strong>Enter the names</strong>Grandma, the cousins, the whole office. Three or more.</div>
          <div><strong>Add exclusions</strong>Keep couples, siblings or housemates from drawing each other.</div>
          <div><strong>Share one link</strong>Drop it in the family chat. Everyone picks their name and draws.</div>
          <div><strong>Make wish lists</strong>Reserve gifts secretly so nobody wraps the same sweater twice.</div>
        </div>
      </section>

      <section className="section">
        <h2>Everything your gift exchange needs</h2>
        <div className="feature-grid">
          {[["🎩 Never draw yourself", "The draw always works the first time. No redraws, no awkward \"I got me.\""],
            ["💑 Exclusions", "Keep couples, siblings and housemates apart, or avoid last year's matches."],
            ["🔗 One invitation link", "Paste it in WhatsApp, a text or an email. Everyone picks their own name."],
            ["🎁 Wish lists", "Add gifts with links and prices. Reserve a gift secretly so there are no duplicates."],
            ["🤫 Anonymous questions", "Ask your person their size or favorite color without giving yourself away."],
            ["🔴 Live draw", "Get everyone on a call and reveal names at the same moment."],
            ["💸 Budget & date", "Everyone sees the spending limit and the countdown to the exchange."],
            ["🧒 Kids' wish lists", "Parents can add a list for children who aren't drawing names."]].map(([t, d]) => (
            <div className="panel" key={t}><h3>{t}</h3><p className="muted small">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="row between"><h2>Coming up</h2><Link className="link" href="/how-it-works">Holiday ideas</Link></div>
        <div className="cards">{upcoming.map(o => (
          <div key={o.k} className={`panel stack ${XMAS_OCC.includes(o.k) ? "card-x" : ""}`} style={{ gap: 8 }}>
            {XMAS_OCC.includes(o.k) && <Bow />}
            <p className="eyebrow">{fmtDate(o.date, { month: "long", day: "numeric" })} · in {daysUntil(o.date)} days</p>
            <h3>{o.k}</h3>
            <Link className="btn small ghost" href={`/new?occ=${o.i}`} style={{ alignSelf: "flex-start" }}>Start a draw</Link>
          </div>))}
        </div>
      </section>

      <section className="section">
        <h2>Pick the Secret Santa that fits your group</h2>
        <div className="chip-links">
          {LANDINGS.filter(l => l.group === "santa").map(l => <Link key={l.slug} href={`/${l.slug}`}>{l.nav}</Link>)}
        </div>
        <h2 style={{ marginTop: 28 }}>Gift exchanges all year</h2>
        <div className="chip-links">
          {LANDINGS.filter(l => l.group === "year").map(l => <Link key={l.slug} href={`/${l.slug}`}>{l.nav}</Link>)}
        </div>
      </section>

      <section className="section faq">
        <h2>Secret Santa questions</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <div className="cta-band">
        <h2>Ready to draw names?</h2>
        <p className="muted" style={{ margin: "8px 0 16px" }}>It takes about a minute. Free, no sign-up.</p>
        <Link className="btn" href="/new?occ=0">Start your Secret Santa</Link>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@graph": [
          { "@type": "WebApplication", name: "Secret Santa Generator", applicationCategory: "LifestyleApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: "https://secretsantageneratorapp.com/" },
          { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
        ] }) }} />
    </div>
  );
}
