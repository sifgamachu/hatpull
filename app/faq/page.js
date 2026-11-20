import Festive from "@/components/Festive";
export const metadata = { title: { absolute: "Hatpull FAQ | Secret Santa Invitations and Wish Lists" }, description: "Find the official Hatpull website at hatpull.com, open a celebration invitation, recover your draw, and get help with wish lists.", alternates: { canonical: "https://hatpull.com/faq" } };
const FAQ = [
  ["Which website do I use for Hatpull?", "Use hatpull.com, spelled as one word with no hyphen. To join an existing celebration, open the invitation your organizer sent. If you misplaced it, ask your organizer to share it again."],
  ["Is Hatpull free to use?", "Yes. Drawing names, invitations, wish lists and the name picker are free. We earn a small commission when you buy through some gift links."],
  ["Do I need a Hatpull account to join a draw?", "The organizer must sign in with Google or email before creating a celebration. Participants can join using the invitation link without creating an account."],
  ["How do I get back to my celebration on another device?", "Organizers sign in with the account that created the celebration and open My celebrations. For an older group without an owner, open its original private organizer link, sign in, and choose Connect this group to my account. Participants can use their private personal link or optionally sign in to restore their groups."],
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
      <h1>Hatpull frequently asked questions</h1>
      <p>Looking for your celebration? Start at <a href="https://hatpull.com/">hatpull.com</a> or open your private invitation.</p>
      {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
    </div>
  );
}
