"use client";
import { useState } from "react";
import Link from "next/link";
import { drawNames } from "@/lib/core";

const PEOPLE = ["Sam", "Alex", "Jordan", "Riley"];
const WISHES = {
  Jordan: [["A board game", "Something we can play together"], ["Coffee beans", "Whole bean, medium roast"]],
  Riley: [["A notebook", "Dotted pages, any color"], ["Warm socks", "Size medium, wool-free"]],
};

export default function DrawPreview() {
  const [recipient, setRecipient] = useState(null);
  const [showWishes, setShowWishes] = useState(false);
  const [error, setError] = useState("");
  function reveal() {
    try {
      const result = drawNames(PEOPLE, [{ a: "Sam", b: "Alex" }, { a: "Alex", b: "Sam" }]);
      if (!result?.Sam) throw new Error("No sample match");
      setRecipient(result.Sam); setShowWishes(false); setError("");
    } catch { setError("The sample couldn’t load. You can still explore the setup guide below."); }
  }
  function reset() { setRecipient(null); setShowWishes(false); setError(""); }
  return (
    <section className="section draw-preview" id="try-a-draw" aria-labelledby="draw-preview-title">
      <div className="draw-preview-intro">
        <p className="eyebrow">Try it before you start</p>
        <h2 id="draw-preview-title">See the draw. Meet your match. Open their wishes.</h2>
        <p>Try a fictional four-person exchange as Sam. Sam and Alex are a couple, so they cannot draw each other.</p>
        <ul className="draw-preview-people" aria-label="Sample participants">{PEOPLE.map(name => <li key={name}>{name}{name === "Sam" && <span> · you in this demo</span>}</li>)}</ul>
        <p className="small muted">Sample only. No sign-in needed and no celebration is created.</p>
        <Link className="link" href="/how-it-works">Read the full setup guide</Link>
      </div>
      <div className="draw-preview-card">
        <p className="eyebrow">Sample celebration · $25 budget</p>
        <div className="draw-preview-result" role="status" aria-live="polite" aria-atomic="true">
          {recipient ? <><p>Sam is getting a gift for</p><strong>{recipient}</strong><p className="small">Your match is someone else, and the couple exclusion is respected.</p></> : <><span className="draw-preview-gift" aria-hidden="true">🎁</span><p>Your sample match is ready to reveal.</p></>}
        </div>
        {error && <p className="note err" role="alert">{error}</p>}
        {!recipient ? <button className="btn" type="button" onClick={reveal}>Reveal my sample match</button> : <>
          <button className="btn ghost" type="button" aria-expanded={showWishes} aria-controls="sample-wishes" onClick={() => setShowWishes(v => !v)}>{showWishes ? "Hide" : "Open"} {recipient}’s sample wish list</button>
          <div id="sample-wishes" hidden={!showWishes}>
            <ul className="draw-preview-wishes">{(WISHES[recipient] || []).map(([name, note]) => <li key={name}><strong>{name}</strong><span>{note}</span></li>)}</ul>
            <p className="tiny muted">Illustrative wishes. In your real group, each participant chooses their own gifts and adds links or preferences.</p>
          </div>
          <div className="row"><Link className="btn" href="/new?occ=0">Create my Secret Santa</Link><button className="link" type="button" onClick={reset}>Reset sample</button></div>
        </>}
      </div>
    </section>
  );
}
