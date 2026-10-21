import Link from "next/link";
import NamePicker from "./NamePicker";
import Festive from "./Festive";

const FAQ = [
  ["Is the name picker really random?", "Yes. Each spin uses your browser's cryptographic random number generator, so every name on the wheel has exactly the same chance of being picked."],
  ["Do I need to sign up?", "No. Paste your names and spin. Your list stays saved in your browser so it's there next time."],
  ["How many names can I add?", "Up to 500. Put one name per line, or separate them with commas."],
  ["Can I pick several winners?", "Turn on \"Remove the winner after each spin\" and keep spinning. Every name is picked once, in random order, and the list of picks is saved below the wheel."],
  ["Is it good for classrooms and giveaways?", "That's what it's built for: calling on students, picking raffle and giveaway winners, choosing who goes first, or deciding where to eat."],
  ["Can I use it for Secret Santa?", "For Secret Santa use our free Secret Santa generator instead. It makes sure nobody draws themselves, supports exclusions for couples, and lets everyone see only their own name."],
];

export default function PickerPage() {
  return (
    <div className="page">
      <Festive on={false} />
      <section className="picker-hero">
        <h1>Online Name Picker</h1>
        <p>Paste your names, spin the wheel, and get a fair random winner. Free, no sign-up, and great for classrooms, raffles and giveaways.</p>
      </section>
      <NamePicker />
      <div className="santa-promo">
        <div><b>Drawing names for Secret Santa?</b><span style={{ color: "#C9D8CF" }}>Use the free generator: no one draws themselves, couples kept apart, wish lists included.</span></div>
        <Link className="btn" href="/secret-santa-generator">Open the Secret Santa generator</Link>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@graph": [
          { "@type": "WebApplication", name: "Online Name Picker", applicationCategory: "UtilitiesApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url: "https://onlinenamepickertool.com/" },
          { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
        ] }) }} />
    </div>
  );
}
