"use client";
import { useCallback, useId, useRef, useState } from 'react';
import EbayGiftCatalog from './EbayGiftCatalog';
import GiftBrowser from './GiftBrowser';
export default function GiftStores({target,budget,currency,disabled,onBusy,onSaved,amazonPanel}) {
  const [store,setStore]=useState('ebay'),[busy,setBusy]=useState(false);
  const id=useId(), tabs=useRef([]);
  const working=useCallback(value=>{setBusy(value);onBusy?.(value);},[onBusy]);
  function navigate(event,index) {
    if(busy)return;
    const next=event.key==='Home'?0:event.key==='End'?1:['ArrowRight','ArrowLeft'].includes(event.key)?1-index:null;
    if(next===null)return;
    event.preventDefault();setStore(next?'amazon':'ebay');tabs.current[next]?.focus();
  }
  return <div className="gift-stores">
    <div className="storefront-topline"><span className="storefront-brand">Hatpull <span>gift shop</span></span><p>Great gifts. One happy wish list.</p></div>
    <div className="gift-store-tabs" role="tablist" aria-label="Choose a gift store">{[['ebay','eBay','Search & save here'],['amazon','Amazon','Browse & link your list']].map(([key,label,detail],index)=><button key={key} ref={el=>{tabs.current[index]=el;}} role="tab" id={id+'-'+key+'-tab'} aria-controls={id+'-'+key+'-panel'} aria-selected={store===key} tabIndex={store===key?0:-1} disabled={busy} onKeyDown={e=>navigate(e,index)} onClick={()=>setStore(key)}><strong>{label}</strong><span>{detail}</span></button>)}</div>
    <div role="tabpanel" id={id+'-ebay-panel'} aria-labelledby={id+'-ebay-tab'} hidden={store!=='ebay'}><EbayGiftCatalog target={target} budget={budget} currency={currency} disabled={disabled} active={store==='ebay'} onBusy={working} onSaved={onSaved}/></div>
    <div role="tabpanel" id={id+'-amazon-panel'} aria-labelledby={id+'-amazon-tab'} hidden={store!=='amazon'} className="store-amazon-panel stack"><GiftBrowser budget={budget} currency={currency}/>{amazonPanel}</div>
  </div>;
}
