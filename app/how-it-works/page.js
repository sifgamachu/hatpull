import Link from "next/link";
import Festive from "@/components/Festive";
export const metadata = { title: "How Secret Santa Works: Step-by-Step Guide", description: "How to run an online Secret Santa: add names, set exclusions, share one invitation link, draw names and share wish lists.", alternates: { canonical: "https://secretsantageneratorapp.com/how-it-works" } };
export default function Page() {
  const steps = [
    ["Start a celebration", "Open the Secret Santa generator, enter your name and the names of everyone taking part. Three people or more."],
    ["Add exclusions", "Stop couples, siblings or housemates from drawing each other. The generator checks that a fair draw is still possible."],
    ["Pick the occasion, date and budget", "Christmas, Secret Santa, an office party or any holiday. Everyone will see the date and the spending limit."],
    ["Share one invitation link", "Copy the invitation into WhatsApp, a text or an email. It's the same link for the whole group."],
    ["Everyone picks their name and draws", "Each person opens the link, taps their own name, and reveals who they're buying for. Nobody else can see it. If the organizer ever resets your name, you'll be told."],
    ["Make wish lists and reserve gifts", "People add gift ideas with links and prices. Others in the group can reserve a gift secretly so nothing gets bought twice."],
    ["Exchange gifts", "On the day, swap presents. After the date, the organizer can see who drew whom, which helps you avoid repeat matches next year."],
  ];
  return (
    <div className="page prose">
      <Festive on />
      <h1>How Secret Santa works</h1>
      <p className="muted">Running a gift exchange online takes about a minute to set up. Here's the whole process.</p>
      <ol className="stack" style={{ paddingLeft: 20 }}>{steps.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
      <h2>Secret Santa rules that keep it fun</h2>
      <ul><li>Agree on a budget and stick to it.</li><li>Set a date and give people at least two weeks.</li><li>Fill in your wish list early so your Secret Santa isn't guessing.</li><li>Keep it secret until the exchange. Anonymous questions help.</li></ul>
      <p style={{ marginTop: 20 }}><Link className="btn" href="/new?occ=0">Start your Secret Santa</Link></p>
    </div>
  );
}
