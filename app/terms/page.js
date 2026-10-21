import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: "Terms of Service", description: "The terms for using Hatpull.", alternates: { canonical: "https://secretsantageneratorapp.com/terms" } };
export default function Page() {
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>Terms of Service</h1>
      <p className="muted">Last updated: October 21, 2026</p>
      <p>These terms govern your use of Hatpull, including the Secret Santa generator at secretsantageneratorapp.com and the name picker at onlinenamepickertool.com, provided by {SITE.company}. By using Hatpull you agree to them.</p>
      <h2>Using Hatpull</h2>
      <p>Hatpull is free to use for personal, family, school and workplace gift exchanges and name drawing. You agree not to misuse the service, including by trying to access celebrations you weren't invited to, interfering with its operation, or posting unlawful, abusive or infringing content.</p>
      <h2>Your content</h2>
      <p>You keep ownership of what you enter. You give us permission to store and display it only as needed to run the service. You're responsible for the content you post and for only entering other people's names with their knowledge.</p>
      <h2>Private links</h2>
      <p>Celebrations are protected by private links. Keep your personal and organizer links confidential. We aren't responsible for access by anyone you share a link with.</p>
      <h2>Draw results</h2>
      <p>Names are assigned randomly, subject to the exclusions set by the organizer. We don't guarantee that a particular result will occur.</p>
      <h2>Third-party links</h2>
      <p>Gift ideas may link to third-party stores. We don't control those sites, and purchases are between you and the store. As an Amazon Associate I earn from qualifying purchases.</p>
      <h2>Disclaimer</h2>
      <p>Hatpull is provided "as is" without warranties of any kind. To the fullest extent permitted by law, {SITE.company} isn't liable for indirect or consequential damages arising from your use of the service.</p>
      <h2>Changes and termination</h2>
      <p>We may update these terms or change or discontinue features. We may remove content or celebrations that violate these terms.</p>
      <h2>Contact</h2>
      <p>Questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </div>
  );
}
