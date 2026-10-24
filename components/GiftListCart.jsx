"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { rpc } from '@/lib/db';
import { getG } from '@/lib/store';
import { money } from '@/lib/core';
import { ownedGiftItems, mergeSavedWish, giftListError } from '@/lib/gift-list.mjs';
import { ebayItemId } from '@/lib/ebay-products.mjs';
import { amazonWishListUrl } from '@/lib/amazon-wish-list.mjs';
import { useGiftProducts, ProductPicture, ProductPrice, AmazonPriceDetails } from './GiftProducts';
import { Sheet } from './Sheet';

const Cart = createContext(null);
export const useGiftListCart = () => useContext(Cart);
export function GiftListIcon() {
  return <svg width="29" height="29" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 4h3l2.4 13h13.3L25 8H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="23" r="1.8" fill="currentColor"/><circle cx="21" cy="23" r="1.8" fill="currentColor"/><path d="M16 3v8m-4-4h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
export function GiftListButton({ compact = false }) {
  const cart = useGiftListCart();
  if (!cart) return null;
  return <button className={'gift-list-button'+(compact?' compact':'')} onClick={cart.show} disabled={cart.contextLoading} aria-busy={cart.contextLoading} aria-haspopup="dialog" aria-label={'Your gift list'+(cart.items ? `, ${cart.items.length} saved` : '')}><span className="gift-list-icon"><GiftListIcon/><b aria-hidden="true">{cart.items?.length ?? '–'}</b></span><span><strong>Your gift list</strong>{!compact&&<small>{cart.contextLoading ? 'Finding your list…' : cart.target ? 'Saved for your gift-giver' : 'Start with your celebration'}</small>}</span></button>;
}

// Key this provider by account + celebration + participant to discard private state on a switch.
export function GiftListCartProvider({ target, children, disabled = false, onBusy, onChanged, initialItems, request = rpc, contextLoading = false, showDock = true, browseHint }) {
  const [items,setItems]=useState(initialItems ?? null),[error,setError]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null),[undo,setUndo]=useState(null),[editing,setEditing]=useState(null);
  const generation=useRef(0),writing=useRef(false),alive=useRef(true),recent=useRef({});
  const gid=target?.gid, mid=target?.mid;
  const refresh=useCallback(async()=>{
    if(!gid||!mid||writing.current)return;
    const current=++generation.current;
    try {
      const {state}=await request('hp_state_delta',{p_gid:gid,p_mtok:getG(gid)?.mtok||null,p_atok:null,p_profile:mid,p_version:null});
      const next=ownedGiftItems(state,{mid});
      if(alive.current&&current===generation.current){setItems(next);setError('');}
    } catch(e) {if(alive.current&&current===generation.current){if(/forbidden|not_found/.test(e.message))setItems(null);setError(giftListError(e));}}
  },[gid,mid,request]);
  useEffect(()=>{alive.current=true;refresh();const wake=()=>{if(!document.hidden)refresh();};window.addEventListener('focus',wake);window.addEventListener('hatpull:groups',wake);window.addEventListener('storage',wake);return()=>{alive.current=false;generation.current++;window.removeEventListener('focus',wake);window.removeEventListener('hatpull:groups',wake);window.removeEventListener('storage',wake);};},[refresh]);
  useEffect(()=>{if(initialItems)setItems(initialItems);},[initialItems]);
  useEffect(()=>{onBusy?.(busy);return()=>onBusy?.(false);},[busy,onBusy]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),7000);return()=>clearTimeout(timer);},[notice]);
  function saved(result,product) {
    if(!alive.current||!result?.wish)return;
    generation.current++;
    if(product)recent.current[product.itemId||product.asin]=product;
    setItems(old=>mergeSavedWish(old,result.wish));setError('');
    setNotice({title:product?.title||result.wish.t,added:result.added!==false});
    refresh();
  }
  async function change(action,wish) {
    if(!gid||!mid||writing.current||disabled)return false;
    writing.current=true;generation.current++;setBusy(true);setError('');
    try {
      const result=await request('hp_change_wish',{p_gid:gid,p_mtok:getG(gid)?.mtok||null,p_target:mid,p_action:action,p_wish:wish});
      if(!alive.current)return false;
      setItems(result.items);
      if(action==='remove'){setUndo(result.wish);setEditing(null);}else if(action==='restore')setUndo(null);else setEditing(null);
      try {await onChanged?.();} catch { /* The targeted save already succeeded. */ }
      return true;
    } catch(e){if(alive.current)setError(giftListError(e));return false;}
    finally {writing.current=false;if(alive.current)setBusy(false);}
  }
  const show=()=>{setOpen(true);refresh();},close=()=>{if(!busy){setOpen(false);setEditing(null);}};
  const value={target,items,busy,saved,show,contextLoading};
  return <Cart.Provider value={value}>{children}
    {showDock&&!open&&<div className={'gift-list-dock'+(notice?' has-notice':'')}><div className="gift-list-dock-copy" role="status">{notice?<><strong>✓ {notice.added?'Added to your gift list':'Already on your gift list'}</strong><span>{notice.title}</span></>:<><strong>{items?.length?`${items.length} saved · ready for your gift-giver`:(browseHint?.title||'See something you love?')}</strong><span>{items?.length?'Everything saves automatically.':(browseHint?.text||'Tap Add to gift list. We’ll keep it here.')}</span></>}</div><GiftListButton compact/></div>}
    {open&&<Sheet className="gift-cart-sheet" onClose={close}>
      <div className="gift-cart-heading"><div><p className="eyebrow">Your picks, all in one place</p><h2>Your gift list {items&&<span>({items.length})</span>}</h2></div><button className="gift-cart-close" onClick={close} disabled={busy} aria-label="Close your gift list">✕</button></div>
      {target?<><div className="gift-cart-destination"><strong>For {target.person}</strong><span>{target.name}{target.budget?` · ${money(target.cur,target.budget)} per gift`:''}</span></div><p className="gift-cart-explainer">Saved automatically for your gift-giver. No checkout or sending needed.</p></>:<div className="gift-cart-empty"><GiftListIcon/><h3>Let’s find your celebration.</h3><p>{'Choose your celebration above so we save gifts to the right person. If you haven’t joined yet, open your invitation first.'}</p><button className="btn" onClick={()=>{close();document.getElementById('gift-celebration')?.focus();}}>Choose my celebration</button><Link href="/my" className="link">Find my celebrations →</Link></div>}
      {error&&<div className="note err" role="alert">{error} <button className="link" disabled={busy} onClick={refresh}>Try again</button></div>}
      {target&&!items&&!error&&<p role="status">Loading your saved gifts…</p>}
      {undo&&<div className="gift-cart-undo" role="status"><span>Gift removed.</span><button onClick={()=>change('restore',undo)} disabled={busy||disabled}>Undo</button></div>}
      {target&&items&&<GiftCartItems items={items} target={target} recent={recent.current} editing={editing} setEditing={setEditing} change={change} disabled={busy||disabled} close={close}/>}
      {target&&<footer className="gift-cart-footer"><button className="btn" onClick={close} disabled={busy}>Continue browsing</button><Link className="link" href={`/g/${gid}/w/${mid}`}>Open full wish list →</Link><p>These are gift wishes. Adding one does not place an order.</p></footer>}
    </Sheet>}
  </Cart.Provider>;
}

function GiftCartItems({items,target,recent,editing,setEditing,change,disabled,close}) {
  const products=useGiftProducts(items.map(w=>w.a||ebayItemId(w.u)));
  if(!items.length)return <div className="gift-cart-empty"><GiftListIcon/><h3>Your next favorite belongs here.</h3><p>Find a gift you love and tap <b>Add to gift list</b>. Your gift-giver will see it on your wish list.</p><button className="btn" onClick={close}>Find my first gift</button></div>;
  return <div className="gift-cart-items">{items.map(w=>{
    const id=w.a||ebayItemId(w.u),candidate=products[id]||recent[id],product=candidate?.expiresAt>Date.now()?candidate:null,list=amazonWishListUrl(w.u);
    const title=product&&w.t==='eBay gift'?product.title:w.t;
    return <article className="gift-cart-item" key={w.id}>
      <div className="gift-cart-picture">{list?<GiftListIcon/>:<ProductPicture product={product} art={w.art}/>}</div>
      <div className="gift-cart-item-content"><h3>{title}</h3>{list?<p>One saved Amazon list. Open it to see its gifts.</p>:product?<ProductPrice product={product}/>:<p className="gift-cart-price-note">{w.p?`${money(target.cur,w.p)} · your estimate`:'Current price available at the store'}</p>}
      {(w.size||w.color)&&<p className="gift-cart-preferences">{[w.size&&`Size: ${w.size}`,w.color&&`Color: ${w.color}`].filter(Boolean).join(' · ')}</p>}{w.n&&<p className="gift-cart-note">{w.n}</p>}
      {list&&<a className="link small" href={list} target="_blank" rel="noopener noreferrer nofollow">Open Amazon list ↗</a>}
      <div className="gift-cart-actions">{!list&&<button disabled={disabled} onClick={()=>setEditing(editing===w.id?null:w.id)}>{editing===w.id?'Cancel details':'Add size, color or a note'}</button>}<button disabled={disabled} onClick={()=>change('remove',{id:w.id})}>Remove</button></div>
      {editing===w.id&&<GiftDetails key={w.id} wish={w} disabled={disabled} onSave={patch=>change('edit',patch)}/>}
      </div>
    </article>;
  })}{Object.values(products).some(p=>p.provider!=='ebay')&&<AmazonPriceDetails/>}</div>;
}
function GiftDetails({wish,disabled,onSave}) {
  const [size,setSize]=useState(wish.size||''),[color,setColor]=useState(wish.color||''),[note,setNote]=useState(wish.n||'');
  return <form className="gift-cart-details" onSubmit={e=>{e.preventDefault();onSave({id:wish.id,size,color,n:note});}}><label>Size or version<input value={size} maxLength={40} onChange={e=>setSize(e.target.value)} disabled={disabled} placeholder="Medium, 12 oz, paperback…"/></label><label>Color<input value={color} maxLength={40} onChange={e=>setColor(e.target.value)} disabled={disabled} placeholder="Your favorite color"/></label><label>A helpful note<textarea value={note} maxLength={140} onChange={e=>setNote(e.target.value)} disabled={disabled} rows={2}/></label><button className="btn small" disabled={disabled}>{disabled?'Saving…':'Save details'}</button></form>;
}
