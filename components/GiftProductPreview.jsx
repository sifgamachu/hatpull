"use client";
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { ProductPicture, ProductPrice } from './GiftProducts';
import { ebaySearchCache, catalogLifetime } from '@/lib/ebay-search-cache.mjs';
import { AFF_REL } from '@/lib/core';

export default function GiftProductPreview({ initial, saved, disabled, target, error, onSave, onViewList, onClose }) {
  const [product, setProduct] = useState(initial), [photo, setPhoto] = useState(0), [loading, setLoading] = useState(true), [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let live = true, timer;
    async function load() {
      setLoading(true);
      try {
        const data = await ebaySearchCache.load('id=' + encodeURIComponent(initial.itemId));
        if (!live) return;
        const found = data.items.find(p => p.itemId === initial.itemId);
        setProduct(found || null); setUnavailable(!found);
        if (found) timer = setTimeout(() => { setProduct(null); load(); }, Math.max(50, catalogLifetime(data)));
      } catch { if (live) { setUnavailable(true); if (initial.expiresAt <= Date.now()) setProduct(null); else timer = setTimeout(() => setProduct(null), initial.expiresAt - Date.now()); } }
      finally { if (live) setLoading(false); }
    }
    load(); return () => { live = false; clearTimeout(timer); };
  }, [initial]);
  const fresh = product?.expiresAt > Date.now() ? product : null;
  const pictures = fresh?.images?.length ? fresh.images : fresh?.image ? [fresh.image] : [];
  const shown = fresh && { ...fresh, image: pictures[photo] || fresh.image };
  const brand = fresh?.aspects?.find(a=>a.name.toLowerCase()==='brand')?.value;
  return <Sheet className="gift-product-sheet" onClose={() => { if (!disabled) onClose(); }}>
    <div className="preview-heading"><span>Hatpull · a little wish, a lovely surprise</span><button type="button" className="gift-cart-close" aria-label="Close gift preview" disabled={disabled} onClick={onClose}>×</button></div>
    <div className="preview-layout">
      <div className="preview-gallery"><div className="preview-main-photo"><ProductPicture product={shown} priority/></div>{pictures.length > 1 && <div className="preview-thumbnails" aria-label="Product photos">{pictures.map((src, index) => <button type="button" key={src} aria-label={`Show product photo ${index + 1}`} aria-pressed={photo === index} onClick={() => setPhoto(index)}><img src={src} alt="" width="64" height="64"/></button>)}</div>}</div>
      <div className="preview-add-bar"><button type="button" className="preview-add-wish" disabled={disabled || (!fresh && !saved)} onClick={() => saved ? onViewList() : onSave(fresh)}><span>{disabled?'Saving…':saved?'View your wish list':'Add to wish list'}</span><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" fill={saved?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8"/></svg></button>{!target&&!saved&&<small>Choose your wish list in the next step.</small>}</div>
      <div className="preview-information">
        {error && <p className="note err" role="alert">{error}</p>}
        {saved && <p className="preview-saved" role="status">✓ Saved for your gift-giver{target?.person ? ` · ${target.person}’s wish list` : ''}.</p>}
        <h2>{fresh?.title || 'Check this gift on eBay'}</h2>
        <p className="preview-product-meta">{[brand,fresh?.condition].filter(Boolean).join(' · ')||'eBay listing'}</p>
        {loading && <p className="small muted" role="status">Loading gift details…</p>}{unavailable && <p className="small note" role="status">More details aren’t available right now. Check the listing on eBay.</p>}
        <p className="preview-guidance">Hatpull may earn a commission when you buy through this link.</p>
        <a className="preview-store-offer" href={fresh?.url || initial.url} target="_blank" rel={AFF_REL} aria-label="View this product and current price on eBay">
          <div className="preview-store-heading"><span className="preview-store-logo"><img src="/stores/ebay.svg" alt="eBay" width="100" height="100"/></span><span>View at store ↗</span></div>
          <ProductPrice product={fresh} provider="ebay"/>
        </a>
        {fresh?.summary && <p className="preview-description">{fresh.summary}</p>}
        {fresh?.aspects?.length > 0 && <details className="preview-specifications"><summary>Product details</summary><dl className="preview-aspects">{fresh.aspects.map(a => <div key={a.name}><dt>{a.name}</dt><dd>{a.value}</dd></div>)}</dl></details>}
        <p className="preview-guidance">Check the size, color, seller and delivery on eBay. After saving, you can add the preferences your gift-giver needs.</p>
        <p className="preview-price-note">Prices and availability can change. The store’s price and delivery charges at checkout apply. Saving a wish does not place an order.</p>
      </div>
    </div>
  </Sheet>;
}
