import Link from "next/link";
import { notFound } from "next/navigation";
import Festive from "@/components/Festive";
import Snow from "@/components/Snow";
import Lights from "@/components/Lights";
import { LANDINGS, getLanding, IDEAS_BY_BUDGET } from "@/lib/landings";
import { SITE, amazonUrl, xmasYear } from "@/lib/core";

export const dynamicParams = false;
export const revalidate = 86400;
export function generateStaticParams() { return LANDINGS.map(l => ({ slug: l.slug })); }

export function generateMetadata({ params }) {
  const l = getLanding(params.slug); if (!l) return {};
  const url = `${SITE.santa}/${l.slug}`;
  return {
    title: { absolute: `${l.title} | Hatpull` },
    description: l.description,
    alternates: { canonical: url },
    openGraph: { title: l.title, description: l.description, url, siteName: "Secret Santa Generator", type: "website" },
  };
}

function startHref(l) { return l.slug.includes("wish-list") || l.slug.startsWith("mothers-day") ? "/new?mode=wish" : `/new?occ=${l.occ}`; }

export default function Landing({ params }) {
  const l = getLanding(params.slug); if (!l) notFound();
  const href = startHref(l);
  const cta = l.festive ? "Start your Secret Santa" : l.slug.startsWith("mothers-day") ? "Start a wish list" : "Start your gift exchange";
  const related = LANDINGS.filter(x => x.slug !== l.slug && x.group === l.group).slice(0, 6);
  const other = LANDINGS.filter(x => x.group !== l.group).slice(0, 4);

  return (
    <div className="page">
      <Festive on={l.festive} />
      {l.festive ? (
        <section className="xmas xmas-sm" aria-label={l.title}>
          <Snow />
          <Lights n={12} />
          <div className="inner1">
            <p className="kicker">🎄 {l.kicker} · {xmasYear()}</p>
            <h1>{l.h1[0]}<em>{l.h1[1]}</em></h1>
            <p className="lede">{l.lede}</p>
            <div className="row" style={{ marginTop: 20 }}>
              <Link className="btn" href={href}>{cta}</Link>
              {!l.ideas && <Link className="btn ghost" href="/gift-finder">Find gift ideas</Link>}
            </div>
          </div>
        </section>
      ) : (
        <section className="hero land-hero">
          <div>
            <p className="eyebrow">{l.kicker}</p>
            <h1>{l.h1[0]}<em>{l.h1[1]}</em></h1>
            <p className="lede">{l.lede}</p>
            <div className="row" style={{ marginTop: 20 }}>
              <Link className="btn" href={href}>{cta}</Link>
              <Link className="btn ghost" href="/gift-finder">Find gift ideas</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section prose-wide">
        {l.intro.map((p, i) => <p key={i}>{p}</p>)}
      </section>

      {l.ideas ? (
        <section className="section">
          <h2>Ideas by budget</h2>
          <div className="feature-grid">
            {IDEAS_BY_BUDGET.map(b => (
              <div className="panel" key={b.label}>
                <h3>{b.label}</h3>
                <ul className="idea-list">
                  {b.items.map(it => <li key={it}><a href={amazonUrl(it, b.lo, b.hi)} target="_blank" rel="noopener noreferrer sponsored">{it}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>Links go to store searches. We may earn a commission on purchases, at no extra cost to you.</p>
          <div className="row" style={{ marginTop: 16 }}><Link className="btn ghost" href="/gift-finder">Open the gift finder</Link></div>
        </section>
      ) : (
        <>
          <section className="section">
            <h2>How it works</h2>
            <div className="how">
              <div><strong>Enter the names</strong>Three people or more, up to 200.</div>
              <div><strong>Set the details</strong>Date, budget and any exclusions.</div>
              <div><strong>Share one link</strong>WhatsApp, text, Slack or email.</div>
              <div><strong>Draw and wish</strong>Everyone draws a name and adds a wish list.</div>
            </div>
          </section>
          <section className="section">
            <h2>Why it works</h2>
            <div className="feature-grid">
              {l.points.map(([t, d]) => <div className="panel" key={t}><h3>{t}</h3><p className="muted small">{d}</p></div>)}
            </div>
          </section>
        </>
      )}

      <section className="section faq">
        <h2>Questions</h2>
        {l.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <section className="section">
        <h2>{l.group === "santa" ? "More Secret Santa tools" : "Other occasions"}</h2>
        <div className="chip-links">
          {related.map(x => <Link key={x.slug} href={`/${x.slug}`}>{x.nav}</Link>)}
          {l.group === "santa"
            ? <Link href="/gift-exchange-generator">Gift exchanges all year</Link>
            : <Link href="/secret-santa-generator">Secret Santa generator</Link>}
          {l.group === "year" && other.filter(x => x.slug !== "secret-santa-gift-ideas").slice(0, 3).map(x => <Link key={x.slug} href={`/${x.slug}`}>{x.nav}</Link>)}
          <Link href="/name-picker">Name picker wheel</Link>
        </div>
      </section>

      <div className="cta-band">
        <h2>Ready to draw names?</h2>
        <p className="muted" style={{ margin: "8px 0 16px" }}>It takes about a minute. Free, no sign-up.</p>
        <Link className="btn" href={href}>{cta}</Link>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@graph": [
          { "@type": "WebPage", name: l.title, description: l.description, url: `${SITE.santa}/${l.slug}` },
          { "@type": "FAQPage", mainEntity: l.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Secret Santa Generator", item: `${SITE.santa}/` },
            { "@type": "ListItem", position: 2, name: l.nav, item: `${SITE.santa}/${l.slug}` },
          ] },
        ] }) }} />
    </div>
  );
}
