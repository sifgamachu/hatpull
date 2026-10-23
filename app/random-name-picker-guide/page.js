import Link from "next/link";
import Festive from "@/components/Festive";
import { PICKER_GUIDE_PATH, PICKER_ORIGIN, SANTA_ORIGIN, siteIdentity } from "@/lib/search";

const url = `${PICKER_ORIGIN}${PICKER_GUIDE_PATH}`;
const title = "How to Pick Random Names: Classrooms, Giveaways & Meetings";
const description = "A practical guide to drawing names from a list: check duplicate entries, remove winners, protect your list and choose between a name wheel and Secret Santa.";
export const metadata = {
  title: { absolute: `${title} | Hatpull` }, description,
  alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "Hatpull Online Name Picker", type: "article", images: [{ url: `${PICKER_ORIGIN}/name-picker/opengraph-image`, width: 1200, height: 630 }] },
};

export default function PickerGuide() {
  return <div className="page prose picker-guide">
    <Festive on={false}/>
    <nav aria-label="Breadcrumb"><Link href={`${PICKER_ORIGIN}/`}>Random name picker</Link><span aria-hidden="true"> / </span><span>Guide</span></nav>
    <p className="eyebrow">A practical guide from Hatpull</p>
    <h1>How to pick random names from a list</h1>
    <p>A random name picker selects from names you already have. Use it to choose a student, draw an eligible giveaway entry or decide who speaks first. Hatpull’s free name wheel accepts up to 1,000 entries and runs the draw in your browser.</p>
    <p className="tiny muted">Updated October 23, 2026 · Hatpull, a Teregna LLC product</p>
    <p><Link className="btn" href={`${PICKER_ORIGIN}/`}>Open the free name picker →</Link></p>

    <h2>Name picker, name generator or Secret Santa?</h2>
    <p>These tools solve different problems. A name picker draws from your own list. A name generator invents new names, such as character or business names. A Secret Santa generator assigns a recipient to every participant and prevents self-matches.</p>
    <ul>
      <li><strong>One winner or the next speaker:</strong> use the <Link href={`${PICKER_ORIGIN}/`}>random name wheel</Link>.</li>
      <li><strong>Several different winners:</strong> use the wheel with winner removal enabled.</li>
      <li><strong>Everyone gives and receives a gift:</strong> use the <Link href={`${SANTA_ORIGIN}/`}>Secret Santa generator</Link>, which supports 3–200 participants, exclusions and wish lists.</li>
    </ul>

    <h2>Prepare a list that matches your rules</h2>
    <ol>
      <li>Replace the sample names with your own. Put one entry on each line. A single-line list can use commas as separators; in a multi-line list, a name such as “Smith, Alex” stays together.</li>
      <li>Check the entry count. Hatpull uses the first 1,000 entries and shows a warning if your list is longer.</li>
      <li>Check duplicates yourself. The picker does not merge repeated names. If Alex appears twice, Alex has two entries. Use a label such as “Alex R.” to distinguish different people with the same first name.</li>
      <li>Decide whether someone can be picked again. Set this before your first spin so the process is clear to everyone watching.</li>
    </ol>

    <h2>Pick multiple winners without repeats</h2>
    <p>Select <strong>Remove the winner after each spin</strong>, spin, then choose <strong>Remove &amp; close</strong> in the winner dialog. That removes one entry from the next draw. If the same person appears on several lines, their other entries remain eligible until you remove them too.</p>
    <p>The wheel needs at least two entries to spin. When one remains after a draw without repeats, that entry is the last in your order. The “Picked so far” panel shows the most recent 20 results, newest first; use <strong>Copy</strong> before reloading or leaving the page. Copy results periodically if you need a record of more than 20 picks.</p>

    <h2>Use a name wheel in class</h2>
    <p>Use first names, initials or agreed classroom nicknames when displaying the wheel. Paste the students participating in that activity, then remove each selected entry if you want everyone to get a turn. For a new question where previous speakers can answer again, keep winner removal off.</p>
    <p>A random selection decides who is called; the teacher still decides how to support students and whether to allow a pass. Check the saved list before the next class, especially when another teacher uses the same computer.</p>

    <h2>Draw giveaway winners clearly</h2>
    <p>Build your eligible entry list before opening the picker. Decide in advance how duplicate entries, unavailable winners and redraws will be handled. Explain those rules to participants, then record your draw and copy the results if you need a record.</p>
    <p>Hatpull selects from the entries you supply. It does not import social-media comments, check eligibility, contact winners or certify a contest. The animation is a visual reveal; the selected entry comes from your browser’s cryptographic random values.</p>

    <h2>Choose a meeting or presentation order</h2>
    <p>For an icebreaker, leave all names in the wheel if repeat turns are acceptable. For presentations, remove each selected entry to build an order without repeats. Copy the results into your meeting notes. For a large event, record them in batches because the on-page history only keeps 20 results.</p>

    <h2>What is saved, and where?</h2>
    <p>The name list and winner-removal setting are saved in this browser’s local storage. Names entered into the picker are not uploaded to Hatpull, and signing in does not sync a picker list to another device. The winner history disappears when the page reloads.</p>
    <p>On a shared computer, use <strong>Clear</strong> to empty the saved list and reload to clear the visible history when you finish. Avoid entering email addresses or other private details into a list you plan to show on screen. See the <Link href={`${SANTA_ORIGIN}/privacy`}>privacy policy</Link> for site-wide data handling.</p>

    <h2>Why use the separate tool for Secret Santa?</h2>
    <p>A wheel draw does not keep track of who is buying for whom, prevent a person drawing themselves or enforce couples’ exclusions. Hatpull’s Secret Santa tool checks those rules and gives participants their own match and wish list. Read <Link href={`${SANTA_ORIGIN}/how-it-works`}>how the gift exchange works</Link> before sharing your invitation.</p>
    <p><Link className="btn" href={`${PICKER_ORIGIN}/`}>Try the name wheel</Link></p>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [
      ...siteIdentity(true),
      { "@type": "Article", "@id": `${url}#article`, headline: title, description, mainEntityOfPage: url, datePublished: "2026-10-23", dateModified: "2026-10-23", author: { "@id": `${SANTA_ORIGIN}/#organization` }, publisher: { "@id": `${SANTA_ORIGIN}/#organization` }, image: `${PICKER_ORIGIN}/name-picker/opengraph-image` },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Random name picker", item: `${PICKER_ORIGIN}/` }, { "@type": "ListItem", position: 2, name: "Name-picker guide", item: url }] },
    ] }) }}/>
  </div>;
}
