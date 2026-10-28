import { PICKER_GUIDE_PATH, siteIdentity } from "@/lib/search";
import { SITE } from "@/lib/core";
import Link from "next/link";
import NamePicker from "./NamePicker";
import Festive from "./Festive";

const FAQ = [
  ["Is the name picker really random?", "Each spin selects an entry using your browser's cryptographic random values before the wheel animation finishes. Each entry gets one place on the wheel; repeated names count as separate entries."],
  ["Do I need to sign up?", "No. Paste your names and spin. Your list stays saved in your browser so it's there next time."],
  ["How many names can I add?", "Up to 1,000 entries. Put one name per line, or use commas for a single-line list. If you paste more, only the first 1,000 entries are used."],
  ["Can I pick several winners?", "Turn on \"Remove the winner after each spin\", then choose \"Remove & close\" after each result. Removed entries cannot be picked again. The latest 20 picks appear below the wheel until you reload the page. Copy the results before leaving."],
  ["Is this a random name generator?", "Hatpull picks a name from a list you provide. If you mean a random name generator from a list, this is the right tool. It does not invent baby names, business names or character names."],
  ["Are names uploaded or shared?", "The picker keeps your name list in this browser's local storage and does not upload it to Hatpull. It is not shared with other devices. Clear the list when you finish on a shared computer."],
  ["Is it good for classrooms and giveaways?", "That's what it's built for: calling on students, picking raffle and giveaway winners, choosing who goes first, or deciding where to eat."],
  ["Can I use it for Secret Santa?", "For Secret Santa use our free Secret Santa generator instead. It makes sure nobody draws themselves, supports exclusions for couples, and lets everyone see only their own name."],
];

export default function PickerPage() {
  return (
    <div className="page">
      <Festive on={false} />
      <section className="picker-hero">
        <p className="eyebrow">Hatpull · free online name wheel</p>
        <h1>Random Name Picker</h1>
        <p>Paste your list, spin the wheel, and pick a random name. Choose students, giveaway winners or meeting turns from up to 1,000 entries. Free, with no sign-up.</p>
      </section>
      <NamePicker />
      <div className="santa-promo">
        <div><b>Drawing names for Secret Santa?</b><span style={{ color: "#C9D8CF" }}>Use the free generator: no one draws themselves, couples kept apart, wish lists included.</span></div>
        <Link className="btn" href={SITE.santa + "/"}>Open the Secret Santa generator</Link>
      </div>
      <section className="section">
        <h2>How to use the name picker</h2>
        <div className="how">
          <div><strong>Add names</strong>Type or paste names, one per line.</div>
          <div><strong>Spin</strong>Click the wheel or the Spin button.</div>
          <div><strong>See the winner</strong>The wheel slows down and lands on a random name.</div>
          <div><strong>Keep going</strong>Remove winners to draw again without repeats.</div>
        </div>
      </section>
      <section className="section faq">
        <h2>Frequently asked questions</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>
      <section className="section">
        <h2>Choose the right way to draw names</h2>
        <div className="feature-grid">
          <div className="panel stack"><h3>Classroom name picker</h3><p>Paste a class list and choose who answers next. Remove each selected entry to give everyone a turn. Use initials or class nicknames on a shared screen.</p></div>
          <div className="panel stack"><h3>Giveaway winner picker</h3><p>Prepare your eligible entries before spinning. Check repeated names, decide your redraw rules, and copy your results before closing the page.</p></div>
          <div className="panel stack"><h3>Meeting speaking order</h3><p>Pick who goes first in an icebreaker or presentation. Turn on winner removal for different speakers, or leave it off when repeats are allowed.</p></div>
        </div>
        <p style={{ marginTop: 20 }}><Link className="link" href={`${SITE.picker}${PICKER_GUIDE_PATH}`}>Read the name-picker guide: duplicates, repeat winners, privacy and Secret Santa →</Link></p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@graph": [
          ...siteIdentity(true),
          { "@type": "WebApplication", "@id": "https://onlinenamepickertool.com/#app", name: "Hatpull Online Name Picker", alternateName: "Hatpull Random Name Picker", description: "Free browser-based name wheel that picks from up to 1,000 entries supplied by the user, with optional winner removal and local list storage.", featureList: ["Random selection from a supplied list", "Up to 1,000 entries", "Optional winner removal", "Local browser storage", "Copy the latest 20 results"], publisher: { "@id": "https://hatpull.com/#organization" }, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: "https://onlinenamepickertool.com/" },
          { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
        ] }) }} />
    </div>
  );
}
