"use client";
import { useEffect, useState } from "react";
import GiftArtwork from "./GiftArtwork";
import { safeProductImage } from "@/lib/gifts.mjs";
import { EBAY_ITEM_ID, safeEbayImage } from "@/lib/ebay-products.mjs";
import { AFF_REL } from "@/lib/core";
import { ebaySearchCache } from "@/lib/ebay-search-cache.mjs";
export function useGiftProducts(ids) {
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");
  const [products, setProducts] = useState({});
  useEffect(() => {
    let live = true, timer; const abort = new AbortController();
    setProducts({});
    if (!key) return () => abort.abort();
    async function load() {
      const all = {}, parts = key.split(","); let expires = Date.now() + 30 * 60000;
      try {
        const amazon = parts.filter(id => !EBAY_ITEM_ID.test(id)), ebay = parts.filter(id => EBAY_ITEM_ID.test(id));
        for (let i = 0; i < amazon.length; i += 10) {
          const response = await fetch(`/api/gifts?ids=${amazon.slice(i, i + 10).join(",")}`, { signal: abort.signal, cache: "no-store" });
          const data = await response.json(); if (data.status !== "ready") continue;
          for (const item of data.items) all[item.asin] = item;
          expires = Math.min(expires, data.expiresAt || expires);
        }
        let index = 0;
        await Promise.all(Array.from({length:Math.min(3,ebay.length)},async()=>{
          while(index<ebay.length) {
            const id=ebay[index++];
            try {
              const cached=ebaySearchCache.peekProduct(id);
              const data=cached?{items:[cached],expiresAt:cached.expiresAt}:await ebaySearchCache.load('id='+encodeURIComponent(id));
              for(const item of data.items)all[item.itemId]=item;
              expires=Math.min(expires,data.expiresAt||expires);
              if(live)setProducts({...all});
            } catch { /* One unavailable product must not hide the rest of the list. */ }
            if(!live)return;
          }
        }));
        if (live) { setProducts(all); if (Object.keys(all).length) timer = setTimeout(() => { setProducts({}); load(); }, Math.max(1000, expires - Date.now())); }
      } catch { if (live) setProducts({}); }
    }
    load(); return () => { live = false; clearTimeout(timer); abort.abort(); };
  }, [key]);
  const fresh = Object.fromEntries(Object.entries(products).filter(([id,p])=>key.split(',').includes(id)&&p.expiresAt>Date.now()));
  for(const id of key.split(','))if(EBAY_ITEM_ID.test(id)){const p=ebaySearchCache.peekProduct(id);if(p)fresh[id]=p;}
  return fresh;
}
export function ProductPicture({ product, art = "gift", priority = false }) {
  const [broken, setBroken] = useState("");
  const source = product?.expiresAt > Date.now() && (product.provider==='ebay'?safeEbayImage(product.image):safeProductImage(product.image));
  return source && broken !== source ? <img src={source} alt={product.title} width="300" height="240" loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(source)} /> : <GiftArtwork kind={art} />;
}
export function ProductPrice({ product, provider }) {
  const store=(provider||product?.provider)==='ebay'?'eBay':'Amazon';
  if (!product || product.expiresAt <= Date.now() || !Number.isFinite(product.price)) return <span className="small muted">Check current price on {store}</span>;
  return <div className="product-price"><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(product.price)}</strong><span>{store}.com · as of {new Date(product.checkedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>{store==='eBay'&&<span>{product.shipping===0?'Listed shipping: free':product.shipping>0?`Listed shipping: $${product.shipping.toFixed(2)}`:'Check shipping on eBay'} · tax may apply</span>}</div>;
}
export function AmazonPriceDetails() {
  return <details className="tiny muted price-details"><summary>About Amazon prices and product information</summary><p>Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on Amazon.com at the time of purchase will apply to the purchase of this product. Taxes and shipping may be additional.</p><p>CERTAIN CONTENT THAT APPEARS ON THIS SITE COMES FROM AMAZON. THIS CONTENT IS PROVIDED ‘AS IS’ AND IS SUBJECT TO CHANGE OR REMOVAL AT ANY TIME.</p></details>;
}
export function ProductCard({ product, onSelect, saved = false, disabled = false, priorityImage = false, onViewSaved, onPreview, compact = false }) {
  const store=product.provider==='ebay'?'eBay':'Amazon';
  if(compact) return <article className="product-card product-compact">
    <div className="compact-photo"><button type="button" className="product-visual" aria-label={`Preview ${product.title}`} aria-haspopup="dialog" onClick={()=>onPreview?.(product)}><ProductPicture product={product} priority={priorityImage}/></button><button type="button" className="compact-heart" aria-label={saved?`View ${product.title} on your gift list`:`Add ${product.title} to your gift list`} aria-pressed={saved} onClick={()=>saved&&onViewSaved?onViewSaved():onSelect(product)} disabled={disabled||(saved&&!onViewSaved)}><svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" fill={saved?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8"/></svg></button></div>
    <div className="product-body"><div className="compact-price">{product.expiresAt>Date.now()?<strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(product.price)}</strong>:<span>Check price</span>}<span>eBay</span></div><h3><button type="button" className="product-title-button" onClick={()=>onPreview?.(product)} title={product.title}>{product.title}</button></h3><span className="compact-shipping">{product.shipping===0?'Free shipping':product.shipping>0?`+ $${product.shipping.toFixed(2)} shipping`:'Check shipping'} · tax extra</span><div className="compact-actions"><button type="button" className="link" disabled={disabled||(saved&&!onViewSaved)} onClick={()=>saved&&onViewSaved?onViewSaved():onSelect(product)}>{saved?'✓ Saved · View':'♡ Add to list'}</button><a href={product.url} target="_blank" rel={AFF_REL} aria-label={`View ${product.title} on ${store}`}>Shop ↗</a></div><details className="compact-details"><summary>Price details</summary><ProductPrice product={product}/></details></div>
  </article>;
  return <article className="product-card">{onPreview ? <button type="button" className="product-visual" aria-label={`Preview ${product.title}`} aria-haspopup="dialog" onClick={() => onPreview(product)}><ProductPicture product={product} priority={priorityImage}/><span className="product-preview-hint">Quick look</span></button> : <a className="product-visual" href={product.url} target="_blank" rel={AFF_REL} aria-label={`View ${product.title} on ${store}`}><ProductPicture product={product} priority={priorityImage}/></a>}<div className="product-body"><span className="eyebrow">{product.provider==='ebay'?`eBay · ${product.condition}`:product.brand || 'Amazon find'}</span><h3>{onPreview ? <button type="button" className="product-title-button" onClick={() => onPreview(product)}>{product.title}</button> : <a href={product.url} target="_blank" rel={AFF_REL}>{product.title}</a>}</h3><ProductPrice product={product}/><button className="btn small block" onClick={() => saved && onViewSaved ? onViewSaved() : onSelect(product)} disabled={disabled||(saved&&!onViewSaved)}>{saved ? "✓ On your list · View" : "♡ Add to gift list"}</button><a className="product-shop" href={product.url} target="_blank" rel={AFF_REL}>View on {store} ↗</a></div></article>;
}
