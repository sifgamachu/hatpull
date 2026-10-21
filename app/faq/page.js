import Festive from "@/components/Festive";
export const metadata = { title: "FAQ", description: "Answers to common questions about the free Secret Santa generator and online name picker.", alternates: { canonical: "https://secretsantageneratorapp.com/faq" } };
const FAQ = [
  ["Is it free?", "Yes. Drawing names, invitations, wish lists and the name picker are free. We earn a small commission when you buy through some gift links."],
  ["Does anyone need to sign up?", "No. The organizer gets a private organizer link and everyone else joins with the invitation link. Nobody needs an account or has to share an email address."],
  ["How do I get back to my celebration on another device?", "Use your personal link (shown on your celebration page). Organizers have a separate organizer link. Keep both private."],
  ["Can someone see who I drew?", "No. Your result is shown only to you. The organizer can see the full results only after the celebration date."],
  ["What if someone joins as the wrong person?", "The organizer can reset that name from Manage settings. The right person then picks it again from the invitation link and keeps the same match. If someone else may have seen the match, the organizer can redraw all names instead."],
  ["Can I add or remove people after the draw?", "Yes, from Manage settings. Changing people or exclusions redraws all names. Everyone keeps their link and unwraps their new name the next time they open it."],
  ["How does the live draw work?", "The organizer starts a live draw when everyone has the celebration open. After a 30-second countdown each person's name is revealed on their own screen at the same moment."],
  ["How do I delete my data?", "The organizer can delete a celebration from Manage settings, which removes all names, wish lists and messages. You can also email us."],
];
export default function Page() {
  return (
    <div className="page prose faq">
      <Festive on />
      <h1>Frequently asked questions</h1>
      {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
    </div>
  );
}
