"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { rpc } from '@/lib/db';
import { getG } from '@/lib/store';
import { rid } from '@/lib/core';
import { positiveMoney } from '@/lib/gifts.mjs';
import { ebayWish } from '@/lib/ebay-products.mjs';
import { ebaySearchCache, searchKey as catalogKey, catalogLifetime } from '@/lib/ebay-search-cache.mjs';
import { ProductCard } from './GiftProducts';
import { useGiftListCart } from './GiftListCart';
import { ebayItemId } from '@/lib/ebay-products.mjs';

const categories = [['gift set','All gifts'],['coffee gift set','Coffee & tea'],['board game','Games'],['throw blanket','Home & cozy'],['wireless headphones','Electronics'],['art supplies','Arts & crafts']];
export default function EbayGiftCatalog({ target, budget, currency = '$', disabled = false, active = true, onBusy, onSaved }) {
  const formId = useId(), writing = useRef(false), cart = useGiftListCart();
  const cap = (!currency || currency === '$') ? positiveMoney(budget) : null;
  const [term,setTerm] = useState('gift set'), [query,setQuery] = useState('gift set'), [maximum,setMaximum] = useState(cap ? String(cap) : '50'), [appliedMaximum,setAppliedMaximum]=useState(cap ? String(cap) : '50'), [sort,setSort] = useState('recommended'), [page,setPage] = useState(1), [retry,setRetry] = useState(0);
  const [result,setResult] = useState(null), [busy,setBusy] = useState(false), [saved,setSaved] = useState({}), [message,setMessage] = useState(null), [error,setError] = useState('');
  const max = positiveMoney(appliedMaximum), effectiveMax = cap ? Math.min(max || cap,cap) : max || 0;
  const searchKey = catalogKey({q:query,max:effectiveMax,sort,page});
  const context = (target?.gid || '') + ':' + (target?.mid || '');
  useEffect(()=>{setMaximum(cap ? String(cap) : '50');setAppliedMaximum(cap ? String(cap) : '50');setPage(1);},[cap]);
  useEffect(()=>{setSaved({});setMessage(null);setError('');},[context]);
  useEffect(()=>{onBusy?.(busy);return()=>onBusy?.(false);},[busy,onBusy]);
  useEffect(()=>{
    if (!active) return;
    let live=true, timer;
    ebaySearchCache.load(searchKey).then(data=>{
      if(!live)return;
      setResult({...data,key:searchKey});
      timer=setTimeout(()=>setRetry(x=>x+1),Math.max(50,catalogLifetime(data)));
    }).catch(()=>{if(live)setResult({status:'unavailable',items:[],key:searchKey});});
    return()=>{live=false;clearTimeout(timer);};
  },[searchKey,retry,active]);
  function applyBudget(value) {
    const amount=positiveMoney(value), next=cap?Math.min(amount||cap,cap):amount||0;
    setMaximum(next?String(next):'');setAppliedMaximum(String(next));setPage(1);
  }
  function category(q) {setTerm(q);setQuery(q);setPage(1);}
  async function save(product) {
    if(!target?.mid){cart?.show();return;}
    if(disabled || cart?.busy || writing.current)return;
    const destination=target; writing.current=true;setBusy(true);setError('');setMessage(null);
    try {
      const wish=ebayWish(product,rid(6)), tokens=getG(destination.gid);
      const value=await rpc('hp_add_wish',{p_gid:destination.gid,p_mtok:tokens?.mtok||null,p_target:destination.mid,p_wish:wish});
      cart?.saved(value,product);setSaved(v=>({...v,[product.itemId]:true}));setMessage({title:product.title,target:destination,id:value.wish.id});await onSaved?.(value);
    } catch(e) {setError(/forbidden/.test(e.message)?'Open your participant invitation or sign in again to save to this wish list.':/wish_list_full|too large/.test(e.message)?'Your wish list is full. Remove a gift before adding another.':'Couldn’t save that gift. Please try again.');}
    finally {writing.current=false;setBusy(false);}
  }
  const cached=ebaySearchCache.peek(searchKey);
  const current=cached || (result?.key===searchKey && (result.status!=='ready' || catalogLifetime(result)) ? result : null);
  const ready=!!target?.mid&&!disabled, loading=!current;
  const department=categories.some(([q])=>q===query)?query:'';
  return <section className="ebay-catalog" aria-label="Find gifts on eBay">
    <div className="store-search-header">
      <form className="store-search" role="search" aria-label="Search eBay gifts" onSubmit={e=>{e.preventDefault();setQuery(term.trim()||'gift set');applyBudget(maximum);setRetry(x=>x+1);}}>
        <label className="sr-only" htmlFor={formId+'-department'}>Gift department</label>
        <select id={formId+'-department'} className="store-department" value={department} onChange={e=>category(e.target.value||'gift set')}><option value="">All departments</option>{categories.map(([q,label])=><option key={q} value={q}>{label}</option>)}</select>
        <label className="sr-only" htmlFor={formId+'-search'}>Search gifts on eBay</label>
        <input id={formId+'-search'} type="search" maxLength={100} value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search gifts on eBay" autoComplete="off"/>
        <button className="store-search-button" type="submit" aria-label="Search gifts"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.5"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></button>
      </form>
      <div className="store-categories" aria-label="Gift categories">{categories.map(([q,label])=><button key={q} aria-pressed={query===q} onClick={()=>category(q)}>{label}</button>)}</div>
    </div>
    <div className="store-results-layout">
      <aside className="store-filters" aria-label="Gift price filters">
        <div><h3>Price</h3><p className="small">{cap?'Celebration budget: $'+cap:'Find something in your budget.'}</p>
          <div className="store-price-shortcuts">{[15,25,50,100].filter(v=>!cap||v<=cap).map(v=><button key={v} aria-pressed={effectiveMax===v} onClick={()=>applyBudget(String(v))}>Under ${v}</button>)}<button aria-pressed={effectiveMax===(cap||0)} onClick={()=>applyBudget(cap?String(cap):'')}>{cap?'Full budget':'Any price'}</button></div>
          <form className="store-budget-form" onSubmit={e=>{e.preventDefault();applyBudget(maximum);}}><label htmlFor={formId+'-max'}>Maximum (US$)</label><div><input id={formId+'-max'} type="number" min="0.01" max={cap||10000} step="0.01" value={maximum} onChange={e=>setMaximum(e.target.value)} placeholder="Any price"/><button type="submit">Go</button></div></form>
        </div>
        <div className="store-shopping-notes"><h3>Shopping on eBay</h3><p>New items · Buy It Now</p><p>Save a wish here. Buy on eBay.</p><p>Shipping and tax may be extra.</p>{currency&&currency!=='$'&&<p>Your celebration uses {currency}. Prices here are US dollars; compare currencies before buying.</p>}<p>Hatpull may earn a commission from eBay purchases.</p></div>
      </aside>
      <div className="store-results">
        <div className="store-results-toolbar"><div><h2>Gifts for every kind of person</h2><p role="status">{loading?'Searching eBay…':current.status==='ready'?(current.items.length?current.items.length+' results for “'+query+'”':'No results for “'+query+'”'):'Search is temporarily unavailable'}{effectiveMax>0&&<span> · Up to ${effectiveMax}</span>}</p></div><div className="store-sort"><label htmlFor={formId+'-sort'}>Sort by</label><select id={formId+'-sort'} value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="recommended">Best match</option><option value="low">Lowest cost</option><option value="high">Highest cost</option></select></div></div>
        <p className="store-catalog-note">New Buy It Now items · Prices in US dollars. Shipping and tax may be extra. Hatpull may earn a commission from eBay purchases.</p>
        {currency&&currency!=='$'&&<p className="store-catalog-note">Your celebration uses {currency}; compare currencies before buying.</p>}
        {sort!=='recommended'&&<p className="tiny muted store-sort-note">Sorted by item price + estimated shipping. Final delivery charges may differ.</p>}
        {!ready&&<p className="store-save-hint">{disabled?'Checking your wish list…':'Choose your celebration above to save favorites. You can browse first.'}</p>}
        {error&&<p className="note err" role="alert">{error}</p>}
        {message&&!cart&&<div className="quick-saved" role="status"><b>✓ Saved to {message.target.person}’s wish list</b><span>{message.title}</span><Link className="link" href={'/g/'+message.target.gid+'/w/'+message.target.mid+'?edit='+encodeURIComponent(message.id)}>View gift or add size & color →</Link></div>}
        <div aria-busy={loading} data-search-key={searchKey} data-search-state={loading?'loading':current.status}>
          {loading?<div className="product-grid ebay-product-grid store-skeletons" aria-hidden="true">{Array.from({length:6},(_,i)=><div className="product-card store-skeleton" key={i}><div className="skeleton-photo"/><div className="skeleton-line"/><div className="skeleton-line short"/><div className="skeleton-price"/></div>)}</div>:current.status!=='ready'?<div className="store-empty"><h3>We couldn’t load these gifts.</h3><p>Please try again, or choose the Amazon tab to keep browsing.</p><button className="btn small ghost" onClick={()=>{setResult(null);setRetry(x=>x+1);}}>Try again</button></div>:!current.items.length?<div className="store-empty"><h3>No gifts matched this search.</h3><p>Try a different phrase or adjust your price filter.</p></div>:<>
            <div className="product-grid ebay-product-grid">{current.items.map((product,index)=><ProductCard key={product.itemId} product={product} onSelect={save} saved={cart?.items?cart.items.some(w=>ebayItemId(w.u)===product.itemId):!!saved[product.itemId]} onViewSaved={cart?.show} disabled={disabled||busy||cart?.busy||(!target&&!cart)} priorityImage={index<3}/>)}</div>
            {(page>1||current.hasMore)&&<div className="row store-pagination"><button className="btn small ghost" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Previous</button><span className="small">Page {page}</span><button className="btn small ghost" disabled={!current.hasMore} onClick={()=>setPage(p=>p+1)}>Next gifts →</button></div>}
          </>}
        </div>
        <p className="store-price-disclaimer">Prices and availability can change. Check the variation, seller, delivery and total on eBay. Saving a wish does not buy an item.</p>
      </div>
    </div>
  </section>;
}
