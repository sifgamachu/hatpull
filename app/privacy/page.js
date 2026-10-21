import { SITE } from "@/lib/core";
export const metadata = { title: "Privacy Policy", description: "How Hatpull collects, uses and protects your information." };
export default function Page() {
  return (
    <div className="page prose">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: October 21, 2026</p>
      <p>This policy explains what information Hatpull ("we", "us"), a product of {SITE.company}, collects when you use our Secret Santa generator, name picker and related pages, and how we use it.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Celebration details you enter:</b> the celebration name, occasion, date, budget, message, and the first names or nicknames of participants.</li>
        <li><b>Wish list content:</b> gift ideas, links, prices, notes, hobbies, age range, and, if the organizer turns it on, a mailing address.</li>
        <li><b>Messages and questions</b> posted inside a celebration.</li>
        <li><b>Name picker lists</b> stay in your own browser and are not sent to us.</li>
        <li><b>Technical data:</b> our hosting provider processes standard request data such as IP address and browser type to deliver and secure the service.</li>
      </ul>
      <p>We don't require accounts, and we don't ask for email addresses or phone numbers to take part.</p>
      <h2>How we use it</h2>
      <p>Only to run your celebration: to perform the draw, show each person their own result, display wish lists according to the organizer's settings, and keep the service secure. We don't sell your information, and we don't use it for advertising profiles.</p>
      <h2>Who can see what</h2>
      <p>Each person's drawn name is visible only to them. The organizer can see the full results only after the celebration date. Wish lists, messages and questions are visible to members of the same celebration, subject to the organizer's visibility settings. Access is controlled by private links. Anyone with a link can open what it unlocks, so please keep personal and organizer links private.</p>
      <h2>Cookies and local storage</h2>
      <p>We store your private celebration links in your browser's local storage so you can return to them. We don't use advertising cookies. Some gift links go to third-party stores, such as Amazon, that may set their own cookies and pay us a commission.</p>
      <h2>Service providers</h2>
      <p>We use Vercel to host the website and Supabase to store celebration data in the United States. They process data on our behalf under their own security and privacy commitments.</p>
      <h2>Retention and deletion</h2>
      <p>Organizers can delete a celebration at any time from Manage settings, which permanently removes its names, wish lists, messages and questions. We may delete celebrations that have been inactive for more than 18 months.</p>
      <h2>Children</h2>
      <p>Hatpull is intended for use by adults and families. Children's wish lists can be created only by a parent or guardian, who controls them. We don't knowingly collect personal information directly from children under 13.</p>
      <h2>Your choices</h2>
      <p>You can ask us to access, correct or delete information about you by emailing <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      <h2>Changes</h2>
      <p>We'll update this page if our practices change and revise the date above.</p>
    </div>
  );
}
