import Link from "next/link";
import { SITE } from "@/lib/core";
import Festive from "@/components/Festive";
export const metadata = { title: "Privacy Policy", description: "How Hatpull collects, uses and protects your information.", alternates: { canonical: "https://secretsantageneratorapp.com/privacy" } };
export default function Page() {
  const who = `${SITE.legalName}${SITE.address ? `, ${SITE.address}` : ""}`;
  return (
    <div className="page prose">
      <Festive on={false} />
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: October 21, 2026</p>
      <p>Hatpull (the Secret Santa generator at secretsantageneratorapp.com and the name picker at onlinenamepickertool.com) is run by {who} ("we", "us"). This policy explains what we collect, why, and the choices you have. Contact us any time at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>{SITE.address ? "" : " (our mailing address is available on request)"}.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Celebration details you enter:</b> the celebration name, occasion, date, budget, message, and the first names or nicknames of participants.</li>
        <li><b>Wish list content:</b> gift ideas, links, prices, notes, hobbies, age range, and, if the organizer turns it on, a mailing address.</li>
        <li><b>Messages and questions</b> posted inside a celebration.</li>
        <li><b>Optional account:</b> if you choose to sign in with Google, we receive your name, email address and Google account ID. If you sign in with an email link, we receive your email address. We use these only to run your account, link your name in a celebration to you, let you get back in on any device, and send the emails described below. We don't use Google data for advertising and never sell or share it.</li>
        <li><b>Email preferences and consent records:</b> whether you want reminders and marketing emails, and, if you opt in to marketing, when, where and the exact wording you agreed to.</li>
        <li><b>Name picker lists</b> stay in your own browser and are not sent to us.</li>
        <li><b>Technical data:</b> our hosting provider processes standard request data such as IP address and browser type to deliver and secure the service.</li>
        <li><b>Abuse prevention:</b> when someone creates a celebration, we store a scrambled one-way code made from their IP address, so we can limit how many celebrations one person creates. It can't be turned back into the address.</li>
        <li><b>Fonts:</b> our pages load fonts from Google Fonts, so your browser connects to Google, which receives your IP address and browser details.</li>
      </ul>
      <p>Signing in is optional. You can draw names, join and make wish lists without an account, email address or phone number.</p>

      <h2>How we use it, and our legal bases</h2>
      <ul>
        <li><b>Running celebrations</b> (the draw, showing each person their own result, wish lists, messages): to provide the service you asked for (contract).</li>
        <li><b>Optional accounts</b> (recovering access, protecting your name, syncing across devices): to provide the service you asked for (contract).</li>
        <li><b>Reminder emails</b> about celebrations you're in (a week before and the day before): our legitimate interest in helping your exchange go smoothly. They're on by default when you sign in, and you can turn them off in your account or with one click in any reminder. Reminders contain no advertising.</li>
        <li><b>Marketing emails</b> (holiday gift ideas, an invitation to run Secret Santa again next year): only with your consent, given by ticking an unticked box. You can withdraw it any time.</li>
        <li><b>Security and abuse prevention:</b> our legitimate interest in keeping the service safe.</li>
      </ul>
      <p>We don't sell your information and don't use it to build advertising profiles.</p>

      <h2>Who can see what</h2>
      <p>Each person's drawn name is visible only to them. The organizer can see the full results only after the celebration date, and moving the date earlier doesn't unlock them sooner. If you sign in, your name in a celebration is protected: only your account can open it again. If you don't sign in and the organizer resets your name, whoever picks that name next can see its match, and you'll be told your name was reset. Wish lists, messages and questions are visible to members of the same celebration, subject to the organizer's visibility settings. Access is controlled by private links, so keep your personal and organizer links private.</p>

      <h2>Cookies and storage</h2>
      <p>We store your private celebration links and, if you sign in, your sign-in session in your browser's local storage. These are needed for the service to work. We don't set advertising cookies.</p>
      <h2>Visitor statistics</h2>
      <p>We use Vercel Web Analytics to count page views. It doesn't use cookies and doesn't track you across other websites. Private celebration and invitation links are removed from the page addresses it records.</p>

      <h2>Amazon Associates and affiliate links</h2>
      <p>Hatpull is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. As an Amazon Associate I earn from qualifying purchases.</p>
      <p>When you click a gift idea, you go to Amazon, and Amazon may set cookies in your browser so it can tell that the visit came from us and credit any qualifying purchase. We don't receive your name, address or what you bought. You can block or delete these cookies in your browser settings. To learn how Amazon uses cookies and interest-based ads, see <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ" target="_blank" rel="noopener">Amazon's Privacy Notice</a> and <a href="https://www.amazon.com/adprefs" target="_blank" rel="noopener">Amazon's advertising preferences</a>.</p>
      <p>Gift ideas inside a wish list are built from that person's listed hobbies, so the hobby words appear in the Amazon search link. Amazon receives only the search words and the fact that you came from our site, not the celebration or anyone's name. Amazon links that people paste into their own wish lists are kept as written, except that we remove any other person's affiliate tag.</p>

      <h2>Service providers</h2>
      <p>We use these providers to run Hatpull. Each processes data only on our instructions under a data processing agreement:</p>
      <ul>
        <li><b>Vercel</b> (website hosting and visitor statistics), United States.</li>
        <li><b>Supabase</b> (database and sign-in), United States.</li>
        <li><b>Resend</b> (sending emails), United States.</li>
        <li><b>Google</b> provides "Sign in with Google" if you choose it, under Google's own privacy policy.</li>
      </ul>
      <h2>International transfers</h2>
      <p>Our service is hosted in the United States. If you use Hatpull from outside the US, your information is transferred there. Where the law requires it, we rely on safeguards such as the European Commission's Standard Contractual Clauses (and the UK Addendum) in our providers' agreements, or the EU-U.S. Data Privacy Framework where a provider is certified.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Celebrations: until the organizer deletes them. We may delete celebrations that have been inactive for more than 18 months.</li>
        <li>Accounts: until you delete your account.</li>
        <li>Consent records: for as long as you're subscribed, plus a reasonable period to show we had consent.</li>
        <li>Do-not-email list: if you unsubscribe or delete your account, we keep a one-way scrambled code of your email address so we never email you by mistake.</li>
      </ul>

      <h2>Your rights and choices</h2>
      <p>Depending on where you live, you can ask to access, correct, delete, restrict or object to the use of your information, and to receive a copy of it. If you have an account, you can download your data and delete your account yourself from <Link href="/account">your account page</Link>, and change your email preferences there or with the link in any email. You can withdraw consent to marketing at any time. For anything else, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>; we respond within one month. You also have the right to complain to your local data protection authority.</p>

      <h2>Children</h2>
      <p>Hatpull is for adults and families. Accounts are for people aged 13 and over (or older where local law requires). We don't knowingly collect personal information from children under 13; if we learn we have, we delete it. Parents can add a children's wish list with a first name or nickname and gift ideas. The child doesn't use the site, and the parent controls and can delete the list. Please don't add children's photos, schools or contact details.</p>

      <h2>Changes</h2>
      <p>We'll update this page if our practices change and revise the date above. For significant changes affecting account holders, we'll let you know by email.</p>
    </div>
  );
}
