import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: "About", description: "Hatpull makes free tools for drawing names: a Secret Santa generator and an online name picker.", alternates: { canonical: "https://secretsantageneratorapp.com/about" } };
export default function Page() {
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>About Hatpull</h1>
      <p>Hatpull makes simple, free tools for drawing names. Our Secret Santa generator helps families, friends and offices run a gift exchange without the paper slips: add names, keep couples apart, share one link, and let everyone draw a name and make a wish list. Our online name picker spins a wheel to pick a fair random winner for classrooms, raffles and giveaways.</p>
      <p>We built Hatpull because organizing a gift exchange shouldn't need spreadsheets, sign-ups or someone who secretly knows everyone's match.</p>
      <p>Hatpull is a product of {SITE.company}. Questions or ideas? Write to us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </div>
  );
}
