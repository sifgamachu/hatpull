import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: "Privacy Policy", description: "How Hatpull collects, uses and protects your information.", alternates: { canonical: "https://secretsantageneratorapp.com/privacy" } };
export default function Page() {
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: October 20, 2026</p>
      <p>This policy explains what information Hatpull ("we", "us"), a product of {SITE.company}, collects when you use our Secret Santa generator, name picker and related pages, and how we use it.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Celebration details you enter:</b> the celebration name, occasion, date, budget, message, and the first names or nicknames of participants.</li>
        <li><b>Wish list content:</b> gift ideas, links, prices, notes, hobbies, age range, and, if the organizer turns it on, a mailing address.</li>
        <li><b>Messages and questions</b> posted inside a celebration.</li>
        <li><b>Name picker lists</b> stay in your own browser and are not sent to us.</li>
        <li><b>Technical data:</b> our hosting provider processes standard request data such as IP address and browser type to deliver and secure the service.</li>
        <li><b>Fonts:</b> our pages load fonts from Google Fonts, so your browser connects to Google, which receives your IP address and browser details.</li>
      </ul>
      <p>We don't require accounts, and we don't ask for email addresses or phone numbers to take part.</p>
      <h2>How we use it</h2>
      <p>Only to run your celebration: to perform the draw, show each person their own result, display wish lists according to the organizer's settings, and keep the service secure. We don't sell your information, and we don't use it for advertising profiles.</p>
      <h2>Who can see what</h2>
      <p>Each person's drawn name is visible only to them. The organizer can see the full results only after the celebration date, and moving the date earlier doesn't unlock them sooner. If the organizer resets someone's name, whoever picks that name next can see its match, and the person is told their name was reset. Wish lists, messages and questions are visible to members of the same celebration, subject to the organizer's visibility settings. Access is controlled by private links. Anyone with a link can open what it unlocks, so please keep personal and organizer links private.</p>
      <h2>Cookies and local storage</h2>
      <p>We store your private celebration links in your browser's local storage so you can return to them. We don't set advertising cookies ourselves.</p>
      <h2>Amazon Associates and affiliate links</h2>
      <p>Hatpull is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. As an Amazon Associate I earn from qualifying purchases.</p>
      <p>When you click a gift idea, you go to Amazon, and Amazon may set cookies in your browser so it can tell that the visit came from us and credit any qualifying purchase. We don't receive your name, address or what you bought. You can block or delete these cookies in your browser settings. To learn how Amazon uses cookies and interest-based ads, see <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ" target="_blank" rel="noopener">Amazon's Privacy Notice</a> and <a href="https://www.amazon.com/adprefs" target="_blank" rel="noopener">Amazon's advertising preferences</a>.</p>
      <p>Gift ideas inside a wish list are built from that person's listed hobbies, so the hobby words appear in the Amazon search link. Amazon receives only the search words and the fact that you came from our site, not the celebration or anyone's name.</p>
      <p>Amazon links that people paste into their own wish lists are kept as written, except that we remove any other person's affiliate tag.</p>
      <h2>Visitor statistics</h2>
      <p>We use Vercel Web Analytics to count page views and see which pages are useful. It doesn't use cookies and doesn't track you across other websites. Private celebration and invitation links are removed from the page addresses it records.</p>
      <h2>Service providers</h2>
      <p>We use Vercel to host the website and Supabase to store celebration data in the United States. They process data on our behalf under their own security and privacy commitments.</p>
      <h2>Retention and deletion</h2>
      <p>Organizers can delete a celebration at any time from Manage settings, which permanently removes its names, wish lists, messages and questions. We may delete celebrations that have been inactive for more than 18 months.</p>
      <h2>Children</h2>
      <p>Hatpull is intended for use by adults and families. Children's wish lists are added and managed by a family member in the group, not by the child. We don't knowingly collect personal information directly from children under 13.</p>
      <h2>Your choices</h2>
      <p>You can ask us to access, correct or delete information about you by emailing <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      <h2>Changes</h2>
      <p>We'll update this page if our practices change and revise the date above.</p>
    </div>
  );
}
