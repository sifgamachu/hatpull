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
  return <Sheet className="gift-product-sheet" onClose={() => { if (!disabled) onClose(); }}>
    <div className="preview-heading"><span>Hatpull · eBay gift preview</span><button type="button" className="gift-cart-close" aria-label="Close gift preview" disabled={disabled} onClick={onClose}>×</button></div>
    <div className="preview-layout"><div className="preview-gallery"><div className="preview-main-photo"><ProductPicture product={shown} priority/></div>{pictures.length > 1 && <div className="preview-thumbnails" aria-label="Product photos">{pictures.map((src, index) => <button type="button" key={src} aria-label={`Show product photo ${index + 1}`} aria-pressed={photo === index} onClick={() => setPhoto(index)}><img src={src} alt="" width="64" height="64"/></button>)}</div>}</div>
      <div className="preview-information"><p className="eyebrow">{fresh?.condition || 'eBay listing'}</p><h2>{fresh?.title || 'Check this gift on eBay'}</h2><ProductPrice product={fresh} provider="ebay"/>
        {loading && <p className="small muted" role="status">Loading gift details…</p>}{unavailable && <p className="small note" role="status">More details aren’t available right now. Check the listing on eBay.</p>}
        {fresh?.aspects?.length > 0 && <dl className="preview-aspects">{fresh.aspects.map(a => <div key={a.name}><dt>{a.name}</dt><dd>{a.value}</dd></div>)}</dl>}
        {fresh?.summary && <p className="preview-description">{fresh.summary}</p>}
        <p className="preview-guidance">Check the size, color and delivery on eBay. You can add your preferences to your saved gift.</p>
        {error && <p className="note err" role="alert">{error}</p>}
        {saved && <p className="preview-saved" role="status">✓ On your gift list{target?.person ? ` for ${target.person}` : ''}.</p>}
        <div className="preview-actions"><button type="button" className="btn" disabled={disabled || (!fresh && !saved)} onClick={() => saved ? onViewList() : onSave(fresh)}>{disabled ? 'Saving…' : saved ? 'View your gift list' : target ? '♡ Add to my gift list' : 'Choose my wish list'}</button><a className="btn ghost" href={fresh?.url || initial.url} target="_blank" rel={AFF_REL}>View on eBay ↗</a></div>
        <p className="preview-guidance">Saving adds a wish for your gift-giver. Purchases happen on eBay. Hatpull may earn a commission.</p>
      </div></div>
  </Sheet>;
}
