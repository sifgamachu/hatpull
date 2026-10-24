"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { rpc } from '@/lib/db';
import { getG } from '@/lib/store';
import { rid } from '@/lib/core';
import { positiveMoney } from '@/lib/gifts.mjs';
import { ebayWish } from '@/lib/ebay-products.mjs';
import { ProductCard } from './GiftProducts';

const categories = [['gift set','For everyone'],['coffee gift set','Coffee & tea'],['board game','Games'],['throw blanket','Cozy home'],['wireless headphones','Tech'],['art supplies','Creative gifts']];
export default function EbayGiftCatalog({ target, budget, currency = '$', disabled = false, onBusy, onSaved }) {
  const formId = useId(), writing = useRef(false);
  const cap = (!currency || currency === '$') ? positiveMoney(budget) : null;
  const [term,setTerm] = useState('gift set'), [query,setQuery] = useState('gift set'), [maximum,setMaximum] = useState(cap ? String(cap) : '50'), [appliedMaximum,setAppliedMaximum]=useState(cap ? String(cap) : '50'), [sort,setSort] = useState('recommended'), [page,setPage] = useState(1), [retry,setRetry] = useState(0);
  const [result,setResult] = useState(null), [busy,setBusy] = useState(false), [saved,setSaved] = useState({}), [message,setMessage] = useState(null), [error,setError] = useState('');
  const max = positiveMoney(appliedMaximum), effectiveMax = cap ? Math.min(max || cap,cap) : max || 0;
  const searchKey = new URLSearchParams({q:query,max:String(effectiveMax),sort,page:String(page)}).toString();
  const context = `${target?.gid || ''}:${target?.mid || ''}`;
  useEffect(()=>{setMaximum(cap ? String(cap) : '50');setAppliedMaximum(cap ? String(cap) : '50');setPage(1);},[cap]);
  useEffect(()=>{setSaved({});setMessage(null);setError('');},[context]);
  useEffect(()=>{onBusy?.(busy);return()=>onBusy?.(false);},[busy,onBusy]);
  useEffect(()=>{
    const abort=new AbortController(); let timer;
    setResult(null);
    fetch(`/api/gifts/ebay?${searchKey}`,{signal:abort.signal,cache:'no-store'}).then(r=>r.json()).then(data=>{
      if(abort.signal.aborted)return;
      setResult({...data,key:searchKey});
      if(data.status==='ready')timer=setTimeout(()=>{setResult(null);setRetry(x=>x+1);},Math.max(1000,(data.expiresAt||Date.now()+600000)-Date.now()));
    }).catch(()=>{if(!abort.signal.aborted)setResult({status:'unavailable',items:[],key:searchKey});});
    return()=>{abort.abort();clearTimeout(timer);};
  },[searchKey,retry]);
  async function save(product) {
    if(!target?.mid || disabled || writing.current)return;
    const destination=target; writing.current=true;setBusy(true);setError('');setMessage(null);
    try {
      const wish=ebayWish(product,rid(6)), tokens=getG(destination.gid);
      const value=await rpc('hp_add_wish',{p_gid:destination.gid,p_mtok:tokens?.mtok||null,p_target:destination.mid,p_wish:wish});
      setSaved(v=>({...v,[product.itemId]:true}));setMessage({title:product.title,target:destination,id:value.wish.id});await onSaved?.(value);
    } catch(e) {setError(/forbidden/.test(e.message)?'Open your participant invitation or sign in again to save to this wish list.':/wish_list_full|too large/.test(e.message)?'Your wish list is full. Remove a gift before adding another.':'Couldn’t save that gift. Please try again.');}
    finally {writing.current=false;setBusy(false);}
  }
  const current=result?.key===searchKey?result:null, ready=!!target?.mid&&!disabled;
  return <section className="ebay-catalog stack" aria-label="Find gifts on eBay">
    <div><p className="eyebrow">Find it. Wish for it.</p><h2>Little gifts. Big smiles.</h2><p className="muted">Browse new, Buy It Now items from eBay. Save a favorite here with one tap.</p></div>
    <form className="store-search" onSubmit={e=>{e.preventDefault();setQuery(term.trim()||'gift set');setAppliedMaximum(maximum);setPage(1);setRetry(x=>x+1);}}>
      <div className="store-search-term"><label htmlFor={`${formId}-search`}>What would you love?</label><input id={`${formId}-search`} type="search" maxLength={100} value={term} onChange={e=>setTerm(e.target.value)} placeholder="Coffee, cozy blankets, games…"/></div>
      <div><label htmlFor={`${formId}-max`}>Maximum (US$)</label><input id={`${formId}-max`} type="number" min="0.01" max={cap||10000} step="0.01" value={maximum} onChange={e=>setMaximum(e.target.value)} onBlur={()=>{if(cap&&(!positiveMoney(maximum)||Number(maximum)>cap))setMaximum(String(cap));}} placeholder="Any price"/></div>
      <div><label htmlFor={`${formId}-sort`}>Sort by</label><select id={`${formId}-sort`} value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="recommended">Best match</option><option value="low">Lowest cost</option><option value="high">Highest cost</option></select></div>
      <button className="btn" type="submit">Find gifts</button>
    </form>
    <div className="store-categories" aria-label="Gift categories">{categories.map(([q,label])=><button key={q} className="btn small ghost" aria-pressed={query===q} onClick={()=>{setTerm(q);setQuery(q);setPage(1);}}>{label}</button>)}</div>
    <div className="store-budget-note"><p className="small">{cap?`Showing item prices up to $${effectiveMax}, within your $${cap} celebration budget.`:effectiveMax?`Showing item prices up to US$${effectiveMax}.`:'Prices shown in US dollars.'} Shipping and tax may be extra.</p>{currency&&currency!=='$'&&<p className="small">Your celebration uses {currency}. eBay.com prices are in US dollars; compare currencies before buying.</p>}{sort!=='recommended'&&<p className="small">Cost sorting uses eBay’s item price plus estimated shipping. Final delivery charges may differ.</p>}<p className="tiny muted">Hatpull may earn a commission when you buy through eBay links.</p></div>
    {!ready&&<p className="note small">{disabled?'Checking your wish list…':'Choose your celebration and wish list to save gifts. You can browse first.'}</p>}
    {error&&<p className="note err" role="alert">{error}</p>}
    {message&&<div className="quick-saved" role="status"><b>✓ Saved to {message.target.person}’s wish list</b><span>{message.title}</span><Link className="link" href={`/g/${message.target.gid}/w/${message.target.mid}?edit=${encodeURIComponent(message.id)}`}>View gift or add size & color →</Link></div>}
    {!current?<div className="store-loading" role="status">Finding your next favorite…</div>:current.status!=='ready'?<div className="store-empty"><h3>eBay products aren’t available right now.</h3><p>Try again shortly, choose Amazon above, or save a product link from any store below.</p><button className="btn small ghost" onClick={()=>setRetry(x=>x+1)}>Try again</button></div>:<>
      <p className="small muted" role="status">{current.items.length?`${current.items.length} gift ideas · page ${page}`:'No matching gifts at this price. Try a different search.'}</p>
      <div className="product-grid ebay-product-grid">{current.items.map(product=><ProductCard key={product.itemId} product={product} onSelect={save} saved={!!saved[product.itemId]} disabled={!ready||busy}/>)}</div>
      {(page>1||current.hasMore)&&<div className="row store-pagination"><button className="btn small ghost" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Previous</button><span className="small">Page {page}</span><button className="btn small ghost" disabled={!current.hasMore} onClick={()=>setPage(p=>p+1)}>Next gifts →</button></div>}
    </>}
    <p className="tiny muted">Prices and availability can change. Check the exact variation, seller, delivery and total on eBay before purchasing. Saving a wish does not buy an item.</p>
  </section>;
}
