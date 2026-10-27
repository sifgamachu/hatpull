import StartHero from '@/components/StartHero';
import { siteIdentity } from "@/lib/search";
import Link from "next/link";
import Festive from "@/components/Festive";
import DrawPreview from "@/components/DrawPreview";
import { Bow } from "@/components/bits";
import { LANDINGS } from "@/lib/landings";
import { upcomingOccasions, fmtDate, daysUntil, XMAS_OCC } from "@/lib/core";

export const metadata = {
  title: { absolute: "Free Secret Santa Generator & Wish Lists | Hatpull" },
  description: "Draw Secret Santa names for 3–200 people, exclude couples and share gift wish lists. Organizers sign in; participants join by link. Free to use.",
  alternates: { canonical: "https://secretsantageneratorapp.com/" },
  verification: { other: { "msvalidate.01": "F4861D58DE9F22DD604DD37B0F0CE192" } },
  openGraph: { title: "Free Secret Santa Generator & Wish Lists | Hatpull", description: "Draw names, keep couples apart, share wish lists. Free, with easy participant invitations.", url: "https://secretsantageneratorapp.com/", siteName: "Hatpull", type: "website" },
};
export const revalidate = 3600;

const FAQ = [
  ["How does the Secret Santa generator work?", "Enter the names in your group, add any exclusions, and share one invitation link. Each person opens it, picks their own name, and draws someone. Only they can see who they drew."],
  ["Can someone draw their own name?", "No. The generator never lets anyone draw themselves, so you never have to start over."],
  ["Can I stop couples from drawing each other?", "Yes. With at least four people, add exclusions for couples, siblings, housemates, or anyone who drew each other last year."],
  ["Does everyone need an account?", "The organizer signs in with Google or email to create and manage the celebration. Participants can join with the invitation link and pick their name without an account."],
  ["Can the organizer see who drew whom?", "Not while the exchange is running. The organizer can view the full results after the celebration date, so you can set exclusions to avoid the same matches next year."],
  ["How do wish lists work?", "Open your participant invitation or sign in, then choose your celebration in Gift Finder. Save eBay products directly, link an Amazon wish list once, or add a gift link from another store. Your gift-giver opens your list from the celebration and can reserve individual gifts without showing you the reservation."],
  ["Is it free?", "Yes. Drawing names, wish lists and invitations are all free."],
];

export default function SantaLanding() {
  const upcoming = upcomingOccasions().slice(0, 3);
  return (
    <div className="page journey-surface">
      <Festive />
      <StartHero/>

      <section className="section" aria-labelledby="start-choice-title">
        <h2 id="start-choice-title">What would you like to do?</h2>
        <div className="start-choices">
          <Link className="start-choice" href="/new?occ=0"><span className="start-choice-icon" aria-hidden="true">🎩</span><h3>Organize a Secret Santa</h3><p>Draw names for 3–200 people, set a budget and keep couples apart.</p><span className="start-choice-action">Start a name draw <span aria-hidden="true">→</span></span></Link>
          <Link className="start-choice" href="/new?mode=wish"><span className="start-choice-icon" aria-hidden="true">🎁</span><h3>Share wish lists</h3><p>Create a group for birthdays or any occasion. Share wishes without drawing names.</p><span className="start-choice-action">Start a wish-list group <span aria-hidden="true">→</span></span></Link>
          <Link className="start-choice" href="/gift-finder"><span className="start-choice-icon" aria-hidden="true">🛍️</span><h3>Find a gift</h3><p>Explore eBay gifts in your budget or browse Amazon. You can browse before joining a group.</p><span className="start-choice-action">Open Gift Finder <span aria-hidden="true">→</span></span></Link>
        </div>
      </section>

      <section className="section" id="how">
        <h2>How it works</h2>
        <div className="how">
          <div><strong>Enter the names</strong>Grandma, the cousins, the whole office. Three or more.</div>
          <div><strong>Add exclusions</strong>With four or more people, keep couples, siblings or housemates from drawing each other.</div>
          <div><strong>Share one link</strong>Drop it in the family chat. Everyone picks their name and draws.</div>
          <div><strong>Make wish lists</strong>Reserve gifts secretly so nobody wraps the same sweater twice.</div>
        </div>
      </section>

      <DrawPreview/>

      <section className="section">
        <h2>Everything your gift exchange needs</h2>
        <div className="feature-grid">
          {[["🎩 Never draw yourself", "Valid draws never match a person with themselves. No awkward \"I got me.\""],
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
        <h2>Give your Secret Santa a wish list to shop from</h2>
        <p>Choose your celebration in Gift Finder, then save gifts and add details such as size or color. Your gift-giver can open your wish list from their match.</p>
        <div className="feature-grid">
          <div className="panel"><h3>Save eBay gifts directly</h3><p>Search real products and add favorites to your Hatpull list. For US-dollar celebrations, item prices are filtered to your budget; allow for shipping and tax.</p></div>
          <div className="panel"><h3>Link an Amazon wish list once</h3><p>Add a view-only Amazon list link, then keep choosing gifts on Amazon. Your gift-giver opens that same list. Amazon items stay on Amazon.</p></div>
          <div className="panel"><h3>Add a gift from another store</h3><p>Save its product link and optional preferences. Reserving an individual gift in Hatpull helps the group avoid duplicate purchases; checkout happens at the store.</p></div>
        </div>
        <div className="row" style={{ marginTop: 20 }}><Link className="btn ghost" href="/gift-finder">Browse gifts for your budget</Link><Link className="link" href="/secret-santa-generator-with-wish-list">See how Secret Santa wish lists work</Link></div>
      </section>

      <section className="section">
        <div className="row between"><h2>Coming up</h2><Link className="link" href="/how-it-works">How it works</Link></div>
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
        <p>Planning your first exchange? Use our <Link href="/secret-santa-rules">Secret Santa rules, organizer checklist and invitation template</Link>.</p>
        <p>Organizers sign in with Google or email to save and manage their celebrations across devices. Participant sign-in is optional and enables account access and reminders. <Link href="/how-it-works">Read the setup guide and troubleshooting tips</Link>.</p>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <div className="cta-band">
        <h2>Ready to draw names?</h2>
        <p className="muted" style={{ margin: "8px 0 16px" }}>Free to use. Organizers sign in; participants join by link.</p>
        <Link className="btn" href="/new?occ=0">Start your Secret Santa</Link>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@graph": [
          ...siteIdentity(false),
          { "@type": "WebApplication", "@id": "https://secretsantageneratorapp.com/#app", name: "Hatpull Secret Santa Generator", publisher: { "@id": "https://secretsantageneratorapp.com/#organization" }, applicationCategory: "LifestyleApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: "https://secretsantageneratorapp.com/" },
          { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
        ] }) }} />
    </div>
  );
}
