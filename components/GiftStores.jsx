"use client";
import { useCallback, useState } from 'react';
import EbayGiftCatalog from './EbayGiftCatalog';
import GiftBrowser from './GiftBrowser';
export default function GiftStores({target,budget,currency,disabled,onBusy,onSaved,amazonPanel}) {
  const [store,setStore]=useState('ebay'),[busy,setBusy]=useState(false);
  const working=useCallback(value=>{setBusy(value);onBusy?.(value);},[onBusy]);
  return <div className="gift-stores stack">
    <div><p className="eyebrow">Your favorite stores, one wish list</p><h2>Where would you like to browse?</h2></div>
    <div className="gift-store-options" role="group" aria-label="Choose a gift store">
      <button className={`gift-store-option ${store==='ebay'?'selected':''}`} aria-pressed={store==='ebay'} disabled={busy} onClick={()=>setStore('ebay')}><span className="store-wordmark ebay-wordmark"><span>e</span><span>b</span><span>a</span><span>y</span></span><strong>Discover & save here</strong><span>Real products. One-tap wishes.</span></button>
      <button className={`gift-store-option ${store==='amazon'?'selected':''}`} aria-pressed={store==='amazon'} disabled={busy} onClick={()=>setStore('amazon')}><span className="store-wordmark amazon-wordmark">amazon<span aria-hidden="true">⌣</span></span><strong>Browse Amazon</strong><span>Shop Amazon or link your wish list.</span></button>
    </div>
    {store==='ebay'?<EbayGiftCatalog target={target} budget={budget} currency={currency} disabled={disabled} onBusy={working} onSaved={onSaved}/>:<div className="stack"><GiftBrowser budget={budget} currency={currency}/>{amazonPanel}</div>}
  </div>;
}
