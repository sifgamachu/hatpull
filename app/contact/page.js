import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: { absolute: "Contact Hatpull | Official Support for hatpull.com" }, description: "Contact the Hatpull team for help with invitations, private name draws, wish lists, or organizer access at hatpull.com.", alternates: { canonical: "https://hatpull.com/contact" } };
export default function Page() {
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>Contact Hatpull</h1>
      <p>This is the support page for <a href="https://hatpull.com/">hatpull.com</a>, the Secret Santa organizer from Teregna LLC. Contact us about a celebration, a bug, a feature idea, or a partnership.</p>
      <div className="panel stack" style={{ marginTop: 12 }}>
        <p style={{ margin: 0 }}><b>Email:</b> <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p className="muted small" style={{ margin: 0 }}>We usually reply within two business days, and faster in December.</p>
      </div>
      <h2>Need to delete a celebration?</h2>
      <p>Organizers can delete a celebration and all its data from Manage settings on the celebration page. To restore organizer access on another device, sign in with the account you used and open My celebrations. Older unclaimed groups need their original private organizer link before they can be connected to an account.</p>
    </div>
  );
}
