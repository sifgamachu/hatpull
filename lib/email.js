import "server-only";
import { SITE as S } from "./core";
// Reminder emails (relationship messages about a celebration the person joined). No affiliate links in emails.
const SITE = "https://hatpull.com";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export function reminderEmail(r) {
  const when = r.kind === "tomorrow" ? "tomorrow" : "in one week";
  const subject = r.kind === "tomorrow" ? `Tomorrow: ${r.group_name}` : `One week until ${r.group_name}`;
  const todo = [];
  if (r.mode === "draw" && !r.drawn) todo.push("You haven't unwrapped the name you drew yet.");
  if (!r.wishes) todo.push("Your wish list is empty, so your Secret Santa is guessing. Add a few ideas.");
  const unsub = `${SITE}/unsubscribe?t=${encodeURIComponent(r.unsub_token)}`;
  const addr = S.address;
  const html = `<!doctype html><html><body style="margin:0;background:#F2F5F1;font-family:Arial,Helvetica,sans-serif;color:#142A26">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:14px;border:1px solid #D5DED9" cellpadding="0" cellspacing="0">
<tr><td style="background:#0F3328;border-radius:14px 14px 0 0;padding:22px 24px;color:#F7F2E7"><div style="font-size:12px;letter-spacing:2px;color:#EDC25E;font-weight:bold">HATPULL REMINDER</div>
<div style="font-size:24px;margin-top:6px;font-family:Georgia,serif">${esc(r.group_name)} is ${when}</div></td></tr>
<tr><td style="padding:22px 24px;font-size:15px;line-height:1.6">
<p style="margin:0 0 12px">Hi ${esc(r.member_name || r.name)},</p>
<p style="margin:0 0 12px">${esc(r.group_name)} is on <b>${esc(fmt(r.date))}</b>${r.budget ? ` with a budget of <b>${esc((r.cur || "$") + r.budget)}</b>` : ""}.</p>
${todo.map(t => `<p style="margin:0 0 12px">• ${esc(t)}</p>`).join("")}
<p style="margin:18px 0"><a href="${SITE}/my" style="background:#C62F42;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">Open my celebrations</a></p>
<p style="margin:0;color:#5A6D68;font-size:13px">Your match is still a secret. Only you can see it after signing in.</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #D5DED9;color:#5A6D68;font-size:12px;line-height:1.6">
You're getting this because you joined ${esc(r.group_name)} on Hatpull and turned on reminders.
<a href="${SITE}/account" style="color:#5A6D68">Email settings</a> · <a href="${unsub}" style="color:#5A6D68">Unsubscribe</a><br>
Hatpull by ${esc(S.legalName)}${addr ? ` · ${esc(addr)}` : ""}</td></tr></table></td></tr></table></body></html>`;
  const text = `Hi ${r.member_name || r.name},\n\n${r.group_name} is ${when}, on ${fmt(r.date)}${r.budget ? ` (budget ${(r.cur || "$") + r.budget})` : ""}.\n${todo.map(t => "- " + t).join("\n")}\n\nOpen my celebrations: ${SITE}/my\n\nYou're getting this because you joined ${r.group_name} on Hatpull and turned on reminders.\nEmail settings: ${SITE}/account\nUnsubscribe: ${unsub}\nHatpull by ${S.legalName}${addr ? " · " + addr : ""}\n`;
  return { subject, html, text, unsub };
}

export function reminderPayload(r) {
  const { subject, html, text, unsub } = reminderEmail(r);
  const oneClick = unsub.replace("/unsubscribe?", "/api/unsubscribe?") + "&k=all";
  return { from: process.env.EMAIL_FROM || "Hatpull <reminders@send.secretsantageneratorapp.com>", to: [r.email], subject, html, text,
    reply_to: "hello@secretsantageneratorapp.com",
    headers: { "List-Unsubscribe": `<${oneClick}>, <mailto:hello@secretsantageneratorapp.com?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}
