"use client";
import { useState } from "react";

const MESSAGE = `We’re organizing a Secret Santa! Taking part is optional.

Join by: [deadline]
Gift budget: [amount and currency]
Shipping and tax: [included in the budget / extra]
Exchange or delivery date: [date]
Exchange location or delivery plan: [details]

Please tell the organizer privately about any exclusions before the draw. Once names are final, open the group invitation, choose only your own name, and reveal your match.

Add a few gift ideas within our budget, including sizes, colors or preferences. Keep your match secret, and check their wish list before shopping.

Group invitation: [paste the group invitation link here]

Keep your personal draw link private. If you need to leave or change anything, tell the organizer before anyone shops.`;

export default function RulesTemplate() {
  const [status, setStatus] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(MESSAGE); setStatus("Copied. Replace the bracketed details before sharing."); }
    catch { setStatus("Select the template below and copy it, then replace the bracketed details."); }
  }
  return <div className="rules-template">
    <button className="btn small ghost" type="button" onClick={copy}>Copy organizer message</button>
    <p role="status" className="small">{status || "Edit the bracketed details for your group. This copies text; it does not send invitations."}</p>
    <pre tabIndex={0} aria-label="Secret Santa invitation template">{MESSAGE}</pre>
  </div>;
}
