"use client";
import { useEffect, useState } from 'react';
import { positiveMoney } from '@/lib/gifts.mjs';
import { safeEbayImage } from '@/lib/ebay-products.mjs';
import { ebaySearchCache, catalogLifetime } from '@/lib/ebay-search-cache.mjs';
import { giftPreferencesFromProfile } from '@/lib/gift-preferences.mjs';
import { loadGiftInspiration } from '@/lib/gift-inspiration.mjs';
import StoreIdeaPreview from './StoreIdeaPreview';

// Three families, one product each; the full catalog reuses these public searches.
export default function EbayStorePreview({budget,currency,profile,disabled}) {
  const max=(!currency||currency==='$')?(positiveMoney(budget)||50):50;
  const preferences=giftPreferencesFromProfile(profile),key=JSON.stringify([preferences,max]);
  const [result,setResult]=useState(null),[retry,setRetry]=useState(0),[broken,setBroken]=useState([]);
  useEffect(()=>{
    if(disabled)return;
    let live=true,timer;
    loadGiftInspiration({preferences,max,familyLimit:3,perFamily:1,load:ebaySearchCache.load,isCurrent:()=>live,onUpdate:data=>{
      if(!live)return;
      setResult({key,data});
      clearTimeout(timer);
      if(data.status==='ready')timer=setTimeout(()=>{setResult(null);setRetry(v=>v+1);},Math.max(1000,catalogLifetime(data)));
    }}).catch(()=>{if(live)setResult({key,data:null});});
    return()=>{live=false;clearTimeout(timer);};
  },[key,retry,disabled]);
  const current=result?.key===key&&catalogLifetime(result.data)?result.data:null;
  const seen=new Set();
  const items=(current?.items||[]).filter(product=>{
    const image=safeEbayImage(product.image);
    if(!image||seen.has(image)||broken.includes(image))return false;
    seen.add(image);return true;
  }).slice(0,3);
  const loading=disabled||(!current&&result?.key!==key);
  if(!items.length)return <StoreIdeaPreview profile={profile} store="eBay" loading={loading}/>;
  return <span className="store-preview store-preview-products">
    <span className="store-preview-items">{items.map(product=><span className="store-preview-item" key={product.itemId}>
      <span className="store-preview-photo"><img src={product.image} alt={product.title} width="160" height="140" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={()=>setBroken(values=>[...values,product.image])}/></span>
      <span className="store-preview-title">{product.title}</span>
      <strong className="store-preview-price">${product.price.toFixed(2)}</strong>
    </span>)}</span>
    <span className="store-preview-caption">{current?.loadingMore?'Finding more matching gifts…':`Current eBay finds · up to $${max}`}<span>Item prices · shipping and tax may be extra</span></span>
  </span>;
}
