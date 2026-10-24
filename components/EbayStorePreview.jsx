"use client";
import { useEffect, useState } from 'react';
import { positiveMoney } from '@/lib/gifts.mjs';
import { safeEbayImage } from '@/lib/ebay-products.mjs';
import { ebaySearchCache, searchKey, catalogLifetime } from '@/lib/ebay-search-cache.mjs';

// Reuse the first catalog search, so choosing eBay does not fetch it again.
export default function EbayStorePreview({budget,currency,disabled}) {
  const max=(!currency||currency==='$')?(positiveMoney(budget)||50):50;
  const key=searchKey({q:'gift set',max});
  const [result,setResult]=useState(null),[retry,setRetry]=useState(0),[broken,setBroken]=useState([]);
  useEffect(()=>{
    if(disabled)return;
    let live=true,timer;
    ebaySearchCache.load(key).then(data=>{
      if(!live)return;
      setResult({key,data});setBroken([]);
      timer=setTimeout(()=>{setResult(null);setRetry(v=>v+1);},Math.max(50,catalogLifetime(data)));
    }).catch(()=>{if(live)setResult({key,data:null});});
    return()=>{live=false;clearTimeout(timer);};
  },[key,retry,disabled]);
  const current=!disabled&&(ebaySearchCache.peek(key)||(result?.key===key&&catalogLifetime(result.data)?result.data:null));
  const seen=new Set();
  const items=(current?.items||[]).filter(product=>{
    const image=safeEbayImage(product.image);
    if(!image||seen.has(image)||broken.includes(image))return false;
    seen.add(image);return true;
  }).slice(0,3);
  const loading=disabled||(!current&&result?.key!==key);
  return <span className={`shop-choice-products${items.length?' has-products':''}`}>
    {items.length?<span className="shop-choice-photos">{items.map(product=><span key={product.itemId}><img src={product.image} alt={product.title} width="160" height="120" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={()=>setBroken(values=>[...values,product.image])}/></span>)}</span>:<span className="shop-choice-photo-fallback" aria-hidden="true">{loading?<><span/><span/><span/></>:<span>Find your next favorite</span>}</span>}
    <span className="shop-choice-photo-caption">{items.length?'A peek at current eBay finds':loading?'Finding gift ideas…':'Explore gifts on eBay'}</span>
  </span>;
}
