import Link from "next/link";
import Festive from "@/components/Festive";
import RulesTemplate from "@/components/RulesTemplate";
import { SANTA_ORIGIN } from "@/lib/search";

const URL = `${SANTA_ORIGIN}/secret-santa-rules`;
const TITLE = "Secret Santa Rules: Budget, Exclusions & Organizer Checklist";
const DESCRIPTION = "Plan a Secret Santa with clear rules for the budget, draw, wish lists and exchange. Includes an organizer checklist and a copyable group invitation template.";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: `${TITLE} | Hatpull`, description: DESCRIPTION, url: URL, siteName: "Hatpull", type: "article" },
};
const FAQ = [
  ["Can Secret Santa work with an odd number of people?", "Yes. Each person gives one gift and receives one gift; people do not need to be paired off. Hatpull supports 3–200 participants for a name draw, provided the exclusions still allow a complete assignment."],
  ["Can couples take part without drawing each other?", "Yes. Set an exclusion in each direction before drawing. Hatpull’s Apply both ways option does this for a pair. If too many exclusions make the draw impossible, remove a rule or add participants."],
  ["Does everyone need an account?", "In Hatpull, the organizer signs in with Google or email to create and manage the group. Participants can join from the group invitation and select their own name without an account."],
  ["What happens if someone leaves after the draw?", "Tell the organizer before buying anything. In Hatpull, changing the participant list or redrawing assigns fresh matches to the whole group. Ask everyone to reopen their match and check it before shopping."],
  ["Is this the same as White Elephant?", "No. In a Secret Santa, each person buys for an assigned recipient. In a White Elephant exchange, people typically choose or swap wrapped gifts during the event. Hatpull’s name draw is designed for assigned recipients."],
];

export default function SecretSantaRules() {
  return <div className="page prose picker-guide rules-guide">
    <Festive on={false}/>
    <nav aria-label="Breadcrumb"><Link href="/">Secret Santa generator</Link><span aria-hidden="true"> / </span><span>Rules & checklist</span></nav>
    <p className="eyebrow">Hatpull organizer guide · Updated October 25, 2026</p>
    <h1>Secret Santa rules everyone can agree on</h1>
    <p>Each participant draws one person, buys a gift within the agreed budget, and keeps their identity secret until the exchange. Agree on the details before drawing so everyone knows what to expect.</p>
    <div className="row" style={{ margin: "20px 0" }}><Link className="btn" href="/new?occ=0">Set up your Secret Santa</Link><Link className="link" href="/#try-a-draw">Try a sample draw</Link></div>
    <nav className="rules-contents" aria-label="On this page"><a href="#rules">The rules</a><a href="#checklist">Organizer checklist</a><a href="#message">Invitation template</a><a href="#questions">Common questions</a></nav>

    <h2 id="rules">Seven rules for a smooth gift exchange</h2>
    <ol className="rules-list">
      <li><h3>Make participation a choice</h3><p>Ask who wants to join and set a deadline. In a workplace, keep opting out comfortable and private. Finalize the names before drawing; use a last initial if two participants share a first name.</p></li>
      <li><h3>Set one clear spending limit</h3><p>Choose an amount and currency the group is comfortable with. Say whether delivery charges and tax count toward the limit. For example, with a $25 total limit and $6 delivery, an item priced at $25 would be over budget even before tax. A price filter helps narrow choices, but the checkout total is what matters.</p></li>
      <li><h3>Agree on the exchange date and delivery plan</h3><p>For an in-person exchange, name the time and place. For a remote group, choose an arrival deadline and allow delivery time. Share addresses privately with the people who need them, rather than in a public invitation.</p></li>
      <li><h3>Set exclusions before drawing</h3><p>Decide whether partners, household members or last year’s matches should be excluded. Excluding Sam from drawing Alex does not automatically exclude Alex from drawing Sam unless both directions are selected. Too many restrictions can make a complete draw impossible, especially in a small group.</p></li>
      <li><h3>Keep matches and personal links private</h3><p>Share the group invitation so each participant can choose their own name. A participant’s personal link opens their own draw, so it should not go in the group chat. In Hatpull, the organizer can view all matches after the celebration date; they stay hidden from the organizer during the exchange.</p></li>
      <li><h3>Add useful wishes before shopping starts</h3><p>Include a few affordable choices and any sizes, colors, dietary preferences or other details that help. A product link is useful for an exact item. Hatpull supports direct eBay saves, Amazon list links and gifts from other stores. A linked Amazon list stays on Amazon, so its individual purchases do not sync into Hatpull.</p></li>
      <li><h3>Handle changes before anyone buys</h3><p>If someone cannot take part, pause shopping and tell the organizer. Redrawing can change everyone’s recipient. For individual wishes saved in Hatpull, reserve the gift before buying to help other gift-givers avoid duplicates. Saving or reserving a gift does not place an order.</p></li>
    </ol>

    <h2 id="checklist">Your organizer checklist</h2>
    <ul><li>Confirm the final participants and any exclusions.</li><li>Write the budget, currency and shipping rule in the invitation.</li><li>Set a join deadline, a wish-list deadline and an exchange date.</li><li>Check that the draw is possible before sharing the invitation.</li><li>Ask everyone to choose only their own name and keep their personal link.</li><li>Check who still needs to draw or add wishes before sending a reminder.</li><li>If anything changes, ask everyone to check their current match before buying.</li></ul>
    <p>For the exact Hatpull screens and recovery steps, follow the <Link href="/how-it-works">setup and troubleshooting guide</Link>. Our <Link href="/secret-santa-generator-with-exclusions">exclusions guide</Link> explains matching restrictions, and the <Link href="/secret-santa-generator-with-wish-list">wish-list guide</Link> explains how your recipient’s gifts are shared.</p>

    <h2 id="message">A ready-to-edit message for your group</h2>
    <p>Use this as a starting point for your family chat, team channel or email. Replace every bracketed detail and add only the group invitation link.</p>
    <RulesTemplate/>

    <section className="faq" id="questions"><h2>Common Secret Santa questions</h2>{FAQ.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    <h2>Choose the setup that fits your group</h2>
    <p><Link href="/office-secret-santa">Office Secret Santa</Link> works for coworkers; <Link href="/family-secret-santa">family Secret Santa</Link> includes ideas for relatives and children. If you want everyone to share wishes without drawing a recipient, <Link href="/new?mode=wish">create a wish-list-only group</Link>.</p>
    <p><Link className="btn" href="/new?occ=0">Create your Secret Santa</Link></p>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@graph":[
      {"@type":"Article",headline:TITLE,description:DESCRIPTION,url:URL,mainEntityOfPage:URL,datePublished:"2026-10-25",dateModified:"2026-10-25",author:{"@type":"Organization",name:"Hatpull",url:`${SANTA_ORIGIN}/about`},publisher:{"@id":`${SANTA_ORIGIN}/#organization`}},
      {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Secret Santa generator",item:`${SANTA_ORIGIN}/`},{"@type":"ListItem",position:2,name:"Rules & checklist",item:URL}]},
      {"@type":"FAQPage",mainEntity:FAQ.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))}
    ]})}}/>
  </div>;
}
