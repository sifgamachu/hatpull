import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: "About", description: "Hatpull makes free tools for drawing names: a Secret Santa generator and an online name picker.", alternates: { canonical: "https://secretsantageneratorapp.com/about" } };
export default function Page() {
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>About Hatpull</h1>
      <p>Hatpull makes simple, free tools for drawing names. Our Secret Santa generator helps families, friends and offices run a gift exchange without the paper slips: add names, keep couples apart, share one link, and let everyone draw a name and make a wish list. Our online name picker spins a wheel to pick a fair random winner for classrooms, raffles and giveaways.</p>
      <h2>Two tools for different kinds of draws</h2>
      <ul><li><a href={SITE.santa}>Hatpull Secret Santa Generator</a> assigns one recipient to each participant, supports exclusions and shared wish lists, and keeps matches private during the exchange.</li><li><a href={SITE.picker}>Hatpull Online Name Picker</a> selects a winner from a list in your browser. Use it when you want one winner at a time rather than a private gift-exchange assignment.</li></ul>
      <h2>Accounts and privacy</h2>
      <p>You can use both tools without signing up. Optional sign-in adds cross-device access and celebration reminders. Keep personal and organizer links private: anyone with one may be able to access that role. See our <a href="/privacy">privacy policy</a> for data handling and account deletion.</p>
      <p>We built Hatpull because organizing a gift exchange shouldn't need spreadsheets, sign-ups or someone who secretly knows everyone's match.</p>
      <p>Hatpull is a product of {SITE.legalName}. Questions or ideas? Write to us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </div>
  );
}
