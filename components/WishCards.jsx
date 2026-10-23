"use client";
import { useState } from "react";
import { Sheet } from "./Sheet";
import { ProductPicture, ProductPrice, useGiftProducts } from "./GiftProducts";
import { AFF_REL, amazonUrl, cleanUserLink, money, rid } from "@/lib/core";
import { normalizeWish, positiveMoney, productAsin, productUrl, safeGiftUrl } from "@/lib/gifts.mjs";
import { giftFromInput } from "@/lib/gift-intake.mjs";

export function WishCard({ wish: w, group: g, product, reserved, children }) {
  const fresh = product?.expiresAt > Date.now() ? product : null;
  const usd = !g.cur || g.cur === "$", cap = positiveMoney(g.budget);
  const search = !w.u && w.q ? amazonUrl(w.q, 0, usd ? cap : 0) : "";
  const url = fresh?.url || (w.a ? productUrl(w.a, process.env.NEXT_PUBLIC_AMAZON_TAG) : cleanUserLink(safeGiftUrl(w.u))) || search;
  const amount = w.a ? (usd ? fresh?.price : null) : positiveMoney(w.p);
  return <article className={`product-card wish-card ${reserved ? "reserved" : ""}`}>
    <div className="product-visual"><ProductPicture product={fresh} art={w.art}/>{w.priority === "1" && <span className="favorite-label">♥ Most wanted</span>}{!fresh?.image && <span className="illustration-label">Illustration</span>}</div>
    <div className="product-body"><h3>{w.t}</h3>{fresh && fresh.title !== w.t && <p className="wish-product-title">{fresh.title}</p>}
      {w.a ? <ProductPrice product={fresh}/> : w.p && <p className="wish-estimate"><b>{money(g.cur, w.p)}</b><span>Participant’s estimate · check store price</span></p>}
      {w.a && w.p && <p className="tiny muted">Requested spending limit: {money(g.cur, w.p)}</p>}
      {cap && amount > 0 && <span className={`wish-budget ${amount <= cap ? "" : "over"}`}>{amount <= cap ? "Within group budget" : "Above group budget"}{!w.a ? " · estimate" : ""}</span>}
      {(w.size || w.color) && <dl className="wish-options">{w.size && <div><dt>Size</dt><dd>{w.size}</dd></div>}{w.color && <div><dt>Color</dt><dd>{w.color}</dd></div>}</dl>}
      {w.n && <p className="wish-note">“{w.n}”</p>}
      {url && <a className="product-shop" href={url} target="_blank" rel={w.a || search ? AFF_REL : "noopener noreferrer nofollow"}>{search ? (cap && usd ? `Find options under $${cap} on Amazon` : "Find options on Amazon") : w.a ? "View exact gift on Amazon" : "View gift at store"} ↗</a>}
      <div className="wish-actions">{children}</div>
    </div>
  </article>;
}

export function WishComposer({ initial, group, saving, onSave, onClose }) {
  const [form, setForm] = useState(() => normalizeWish({ id: rid(6), ...initial }));
  const [error, setError] = useState("");
  const asin = productAsin(form.u) || (!form.u ? form.a : "");
  const products = useGiftProducts(asin ? [asin] : []), product = products[asin];
  const set = patch => { setForm(f => ({ ...f, ...patch })); setError(""); };
  const cap = positiveMoney(group.budget);
  return <Sheet onClose={() => { if (!saving) onClose(); }}><div className="row between"><div><p className="eyebrow">A little hint goes a long way</p><h2>{initial?.editing ? "Edit your wish" : "Make a wish"}</h2></div><button className="btn small ghost" onClick={onClose} disabled={saving} aria-label="Close gift form">✕</button></div>
    <form className="stack wish-form" onSubmit={async e => {
      e.preventDefault(); if (saving) return;
      const url = safeGiftUrl(form.u);
      if (form.u.trim() && !url) return setError("Use a valid http or https store link.");
      if (form.p && !positiveMoney(form.p)) return setError("Enter an amount above zero, up to 10,000.");
      let fallback = '';
      if (!form.t.trim() && url) { try { fallback = giftFromInput(url).t; } catch (e) { return setError(e.message); } }
      const wish = normalizeWish({ ...form, t: form.t.trim() || fallback, u: asin ? productUrl(asin) : url, a: asin });
      if (!wish.t) return setError("Give this wish a name.");
      const result = await onSave(wish); if (typeof result === "string") setError(result);
    }}>
      {cap && <p className="note small">Your celebration’s budget is {money(group.cur, cap)} per gift. A few choices help your gift-giver find something you’ll love.</p>}
      <div><label htmlFor="wish-link">Product link <span className="muted">(optional)</span></label><input id="wish-link" maxLength={400} value={form.u} onChange={e => set({ u: e.target.value, a: "" })} placeholder="Paste a link from Amazon or any store"/><p className="tiny muted">Choose the exact size or version at the store, then copy its link.</p></div>
      {product && <div className="wish-product-preview"><ProductPicture product={product}/><div><b>{product.title}</b><ProductPrice product={product}/></div></div>}
      <div><label htmlFor="wish-title">What would you love? <span className="muted">(optional with a link)</span></label><input id="wish-title" maxLength={120} value={form.t} onChange={e => set({ t: e.target.value })} placeholder="e.g. The blue insulated coffee mug"/></div>
      <details className="wish-optional" open={initial?.editing || undefined}><summary>Add size, color or other preferences <span className="muted">(optional)</span></summary><div className="stack">
      <div className="grid2"><div><label htmlFor="wish-size">Size / version</label><input id="wish-size" maxLength={40} value={form.size} onChange={e => set({ size: e.target.value })} placeholder="Medium, 12 oz, paperback…"/></div><div><label htmlFor="wish-color">Color</label><input id="wish-color" maxLength={40} value={form.color} onChange={e => set({ color: e.target.value })} placeholder="Forest green"/></div></div>
      <div><label htmlFor="wish-price">{asin ? "Your spending limit" : "Estimated price"} <span className="muted">({group.cur || "$"}, optional)</span></label><input id="wish-price" type="number" min="0.01" max="10000" step="0.01" value={form.p} onChange={e => set({ p: e.target.value })} placeholder={group.budget || "25"}/><p className="tiny muted">{asin ? "Your preference, not a live Amazon price." : "Gift-givers will see this as your estimate, not a confirmed store price."}</p></div>
      <div><label htmlFor="wish-note">A helpful hint</label><textarea id="wish-note" maxLength={140} value={form.n} onChange={e => set({ n: e.target.value })} placeholder="Why you love it, the exact edition, or an alternative you’d enjoy…"/></div>
      <label className="wish-favorite-toggle"><input type="checkbox" checked={form.priority === "1"} onChange={e => set({ priority: e.target.checked ? "1" : "" })}/><span>♥ Mark as most wanted</span></label>
      </div></details>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : initial?.editing ? "Save changes" : "Add to my wish list"}</button>
    </form>
  </Sheet>;
}
