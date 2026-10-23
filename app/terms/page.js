import Link from "next/link";
import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: "Terms of Service", description: "The terms for using Hatpull.", alternates: { canonical: "https://secretsantageneratorapp.com/terms" } };
export default function Page() {
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>Terms of Service</h1>
      <p className="muted">Last updated: October 23, 2026</p>
      <p>These terms govern your use of Hatpull, including the Secret Santa generator at secretsantageneratorapp.com and the name picker at onlinenamepickertool.com, provided by {SITE.legalName}{SITE.address ? `, ${SITE.address}` : ""}. By using Hatpull you agree to them.</p>
      <h2>Using Hatpull</h2>
      <p>Hatpull is free to use for personal, family and workplace gift exchanges and name drawing. You agree not to misuse the service, including by trying to access celebrations you weren't invited to, interfering with its operation, or posting unlawful, abusive or infringing content.</p>
      <h2>Who can use it</h2>
      <p>You must be at least 13 years old (or the minimum age required in your country) to create an account. If we learn that an account belongs to someone under 13, we'll delete it. Organizers are responsible for only inviting people who can take part.</p>
      <h2>Children's wish lists</h2>
      <p>A parent or guardian may add a wish list for their child using a first name or nickname and gift ideas only. The child doesn't use Hatpull. Don't add a child's photo, school, address or contact details. The parent can edit or delete the list at any time.</p>
      <h2>Organizer and participant accounts</h2>
      <p>Organizers must sign in with Google or email to create and manage a celebration. Participant accounts are optional. Keep your sign-in secure; you're responsible for activity on your account. You can delete your account at any time from <Link href="/account">your account page</Link>.</p>
      <h2>Emails</h2>
      <p>If you sign in, we may send reminders about celebrations you're in. You can turn them off at any time. We send marketing emails only if you opt in, and every email lets you unsubscribe with one click. See our <Link href="/privacy">Privacy Policy</Link>.</p>
      <h2>Your content</h2>
      <p>You keep ownership of what you enter. You give us permission to store and display it only as needed to run the service. You're responsible for the content you post and for only entering other people's names with their knowledge.</p>
      <h2>Private links</h2>
      <p>Organizer management requires the owning account. Older unowned celebrations can be connected to an account once using their original private organizer link. Participant personal links grant access to that participant, so keep them confidential. Deleting your account removes organizer access without deleting shared celebrations; delete those celebrations first if you want their shared data removed.</p>
      <h2>Draw results</h2>
      <p>Names are assigned randomly, subject to the exclusions set by the organizer. We don't guarantee that a particular result will occur.</p>
      <h2>Third-party links</h2>
      <p>Gift ideas may link to third-party stores. We don't control those sites, and purchases are between you and the store. As an Amazon Associate I earn from qualifying purchases.</p>
      <h2>Disclaimer and liability</h2>
      <p>Hatpull is provided "as is" without warranties of any kind. To the fullest extent permitted by law, {SITE.legalName} isn't liable for indirect or consequential damages arising from your use of the service. Nothing in these terms limits rights you have under consumer law that can't be limited.</p>
      <h2>Changes and termination</h2>
      <p>We may update these terms or change or discontinue features. We'll post changes here and update the date above. We may remove content or celebrations that violate these terms.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the United States and the state in which {SITE.legalName} is organized, except where the law of your country of residence gives you protections that can't be waived.</p>
      <h2>Contact</h2>
      <p>Questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </div>
  );
}
