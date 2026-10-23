import { AMAZON_DISCLOSURE, AFF_REL, amazonUrl } from "@/lib/core";
import { positiveMoney } from "@/lib/gifts.mjs";

export default function GiftBrowser({ budget, currency = "$", age = "", compact = false }) {
  const cap = positiveMoney(budget), usd = !currency || currency === "$";
  const audience = age === "Under 5" ? " for preschool children" : age === "5–11" ? " for kids ages 5 to 11" : age === "12–17" ? " for teens" : "";
  return <section className={`amazon-gift-link ${compact ? "compact" : ""}`} aria-label="Browse gifts on Amazon">
    <p>Explore products, photos and current prices on Amazon. When you find something you love, copy its link and add it to your Hatpull wish list.</p>
    <a className="btn amazon-browse-button" href={amazonUrl("gift ideas" + audience, 0, usd ? cap : 0)} target="_blank" rel={AFF_REL}>Browse your gift on Amazon <span aria-hidden="true">↗</span></a>
    {cap && usd && <p className="small muted">Your ${cap} group budget is included in the Amazon search. Check the final price, shipping and tax before buying.</p>}
    {!usd && <p className="small muted">Amazon.com shows US-dollar prices. Check the price against your {currency}{cap || ""} celebration budget before buying.</p>}
    <p className="tiny muted">Opens Amazon in a new tab. {AMAZON_DISCLOSURE}</p>
  </section>;
}
