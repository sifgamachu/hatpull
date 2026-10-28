import Link from "next/link";
import Festive from "@/components/Festive";
export const metadata = { title: "How Secret Santa Works: Step-by-Step Guide", description: "How to run an online Secret Santa: add names, set exclusions, share one invitation link, draw names and share wish lists.", alternates: { canonical: "https://hatpull.com/how-it-works" } };
export default function Page() {
  const steps = [
    ["Start a celebration", "Open the Secret Santa generator, enter your name and the names of everyone taking part. Three people or more."],
    ["Add exclusions", "Stop couples, siblings or housemates from drawing each other. The generator checks that a fair draw is still possible."],
    ["Pick the occasion, date and budget", "Christmas, Secret Santa, an office party or any holiday. Everyone will see the date and the spending limit."],
    ["Sign in and create", "Sign in with Google or email to save the celebration to your organizer account. Your setup stays in place while you sign in. Participants do not need accounts."],
    ["Share one invitation link", "Copy the invitation into WhatsApp, a text or an email. It's the same link for the whole group."],
    ["Everyone picks their name and draws", "Each person opens the link, taps their own name, and reveals who they're buying for. Nobody else can see it. If the organizer ever resets your name, you'll be told."],
    ["Make wish lists and reserve gifts", "Choose your celebration in Gift Finder. Save eBay products directly, link an Amazon wish list once, or add a gift link and optional preferences. Your gift-giver opens your wish list from their match. Reserve individual gifts in Hatpull before buying at the store."],
    ["Exchange gifts", "On the day, swap presents. After the date, the organizer can see who drew whom, which helps you avoid repeat matches next year."],
  ];
  return (
    <div className="page prose">
      <Festive on />
      <h1>How Secret Santa works</h1>
      <p className="muted">Running a gift exchange online takes about a minute to set up. Here's the whole process.</p>
      <ol className="stack" style={{ paddingLeft: 20 }}>{steps.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
      <h2>Secret Santa rules that keep it fun</h2>
      <p>Use the <Link href="/secret-santa-rules">full rules and organizer checklist</Link> for a ready-to-edit invitation, spending-limit examples and answers for odd-sized groups.</p>
      <ul><li>Agree on a budget and stick to it.</li><li>Set a date and give people at least two weeks.</li><li>Fill in your wish list early so your Secret Santa isn't guessing.</li><li>Keep it secret until the exchange. Anonymous questions help.</li></ul>
      <h2>Before you send the invitation</h2>
      <ul><li>Check spelling and use a last initial for people with the same first name.</li><li>Agree on whether the budget includes shipping, and tell everyone the delivery or exchange date.</li><li>Check exclusions in both directions if two people should never draw each other.</li><li>Share the group invitation, not your private organizer or personal link.</li><li>Ask participants to pick only their own name and add a few affordable wishes.</li></ul>
      <h2>When the draw needs attention</h2>
      <h3>Too many exclusions</h3>
      <p>Every person needs an eligible recipient, and every recipient must be assigned exactly once. In a three-person group, excluding both other people for one participant makes a draw impossible. Remove an exclusion or add another participant before trying again.</p>
      <h3>Someone joins or leaves after the draw</h3>
      <p>Adding or removing a participant redraws all names. Tell everyone to check their match again before buying gifts. If shopping has already started, discuss the change with the group first.</p>
      <h3>Someone picked the wrong name</h3>
      <p>The organizer can reset that name from the celebration settings. The match stays the same. If someone may have seen a match they should not know, use the redraw option and notify the group.</p>
      <h3>Getting back on another device</h3>
      <p>Organizers sign in with the account that created or claimed the group, then open My celebrations. Participants can save their private personal link or optionally sign in to restore their celebration on another device. Signed-in members can receive reminders a week and a day before the exchange, and can turn them off on the Account page. Marketing email is a separate opt-in.</p>
      <p>For the shopping steps, see <Link href="/secret-santa-generator-with-wish-list">how shared Secret Santa wish lists work</Link> or open <Link href="/gift-finder">Gift Finder</Link>. Amazon lists open on Amazon; their products and purchase status do not sync into Hatpull.</p>
      <h2>Secret Santa generator or name picker?</h2>
      <p>Use the <Link href="/">Secret Santa generator</Link> when everyone gives and receives one gift and matches should stay private. Use the <a href="https://onlinenamepickertool.com/">name picker wheel</a> for a single winner, a classroom turn, or a random order. A wheel alone does not enforce Secret Santa exclusions or prevent self-matches across a whole group.</p>
      <p style={{ marginTop: 20 }}><Link className="btn" href="/new?occ=0">Start your Secret Santa</Link></p>
    </div>
  );
}
