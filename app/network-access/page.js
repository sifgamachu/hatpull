import { headers } from "next/headers";
import Link from "next/link";
import Festive from "@/components/Festive";
import { SITE } from "@/lib/core";

export async function generateMetadata() {
  const host = (await headers()).get("host")?.split(":")[0];
  const origin = host === "onlinenamepickertool.com" ? SITE.picker : SITE.santa;
  return { title: "Work and school network help", description: "Connection help and a precise IT allowlist for Hatpull's name picker and Secret Santa gift exchanges.", alternates: { canonical: `${origin}/network-access` } };
}

export default function NetworkAccess() {
  return <div className="page prose">
    <Festive on={false} />
    <h1>Using Hatpull at work or school</h1>
    <p>Hatpull is a free name picker and gift-exchange organizer from Teregna LLC. It requires a modern browser with JavaScript enabled. No browser extension or software installation is needed.</p>
    <h2>If a page will not open</h2>
    <p>Ask your IT team to review the block message and the addresses below. An organization may restrict new websites or particular categories. Access is subject to its policies; this guide does not change those policies.</p>
    <p>If the page opens but an invitation, celebration or sign-in does not load, the data service may be unavailable or blocked. A certificate warning should be investigated by IT before you continue.</p>
    <p>Google sign-in is optional. If your organization restricts Google accounts, use the email sign-in option when permitted. You can use the name picker without signing in.</p>
    <h2>For your IT team</h2>
    <p>Review outbound HTTPS on TCP port 443 for the exact hostnames needed below. Website scripts, styles and fonts are served from the website's own domain. The picker runs locally in the browser and saves its names in that browser.</p>
    <div style={{ overflowX: "auto" }}>
      <table><thead><tr><th scope="col">Hostname</th><th scope="col">Purpose</th></tr></thead><tbody>
        <tr><td><code>onlinenamepickertool.com</code></td><td>Name picker, including its scripts and fonts.</td></tr>
        <tr><td><code>secretsantageneratorapp.com</code></td><td>Secret Santa, invitations, wish lists, and account pages.</td></tr>
        <tr><td><code>rkpglmwjpwbrxbluvsqm.supabase.co</code></td><td>Required for Secret Santa data and authentication. Not required for the local picker to spin.</td></tr>
        <tr><td><code>accounts.google.com</code></td><td>Optional Google sign-in, subject to your organization's identity policy.</td></tr>
        <tr><td><code>www.onlinenamepickertool.com</code><br /><code>www.secretsantageneratorapp.com</code></td><td>Redirects to the corresponding address without www.</td></tr>
        <tr><td><code>drawnamesonlinetool.com</code></td><td>Optional legacy address that redirects to the Secret Santa site.</td></tr>
      </tbody></table>
    </div>
    <p>Use hostname rules, not fixed IP addresses or a wildcard for all of Vercel or Supabase. The hosting addresses can change. Secret Santa updates use HTTPS polling; they do not require a WebSocket exception.</p>
    <p>Authentication emails and reminders come from <code>reminders@send.secretsantageneratorapp.com</code>. Review mail filtering separately if a requested sign-in email is missing. Fonts no longer require Google Fonts access. Analytics are optional for site functionality.</p>
    <p><a className="btn ghost small" href="/network-allowlist.txt" download>Download IT connection guide</a></p>
    <p><a href="/font-licenses.txt">Open-source font licenses</a></p>
    <h2>Verify access</h2>
    <ol>
      <li>Open the name picker, enter fictional names, and complete a spin.</li>
      <li>Open Secret Santa, create an approved test exchange and open its invitation.</li>
      <li>If accounts are needed, test the permitted sign-in method and reopen the exchange.</li>
    </ol>
    <p>When requesting help, share the hostname, time, browser, and the block message or category. Remove invitation codes, personal links and sign-in codes before sharing screenshots or logs.</p>
    <p>Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. See our <Link href={SITE.santa + "/privacy"}>privacy policy</Link> and <Link href={SITE.santa + "/how-it-works"}>setup guide</Link> for how the service works.</p>
  </div>;
}
