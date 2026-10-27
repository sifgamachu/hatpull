"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import EbayGiftCatalog from './EbayGiftCatalog';
import EbayStorePreview from './EbayStorePreview';
import AmazonGiftShop from './AmazonGiftShop';
import GiftArtwork from './GiftArtwork';
import { GiftListButton } from './GiftListCart';

const shops = [
  { id: 'ebay', name: 'eBay', label: 'Search & save right here', description: 'Discover real finds, see prices and add gifts to your list in one tap.', art: ['tech','games','coffee'], action: 'Shop eBay' },
  { id: 'amazon', name: 'Amazon', label: 'Browse Amazon & link your list', description: 'Explore gifts on Amazon. Link one Amazon wish list for all your favorites.', art: ['cozy','coffee','books'], action: 'Shop Amazon' },
];

function StoreLogo({store}) {
  return store==='ebay'
    ? <img className="shop-logo shop-logo-ebay" src="/stores/ebay.svg" alt="eBay" width="288" height="288"/>
    : <img className="shop-logo shop-logo-amazon" src="/stores/amazon-available-white.png" alt="Available at Amazon" width="1500" height="723"/>;
}

export default function GiftStores({target,budget,currency,disabled,onBusy,onSaved,amazonPanel,contextPanel,profile,showPreferences=true,selectionDisabled=false,store:controlledStore,onStoreChange}) {
  const [localStore,setLocalStore]=useState(null),[busy,setBusy]=useState(false),[visited,setVisited]=useState({});
  const store=controlledStore===undefined?localStore:controlledStore;
  const id=useId(), heading=useRef(null), shopButtons=useRef({}), focusDestination=useRef(null);
  const working=useCallback(value=>{setBusy(value);onBusy?.(value);},[onBusy]);
  function choose(next) {
    if(busy||selectionDisabled)return;
    focusDestination.current=next?'heading':store;
    if(next)setVisited(v=>({...v,[next]:true}));
    if(onStoreChange)onStoreChange(next);else setLocalStore(next);
  }
  useEffect(()=>{
    if(!focusDestination.current)return;
    if(focusDestination.current==='heading')heading.current?.focus();
    else shopButtons.current[focusDestination.current]?.focus();
    focusDestination.current=null;
  },[store]);
  return <div className={`gift-stores shop-theme-${store||'lobby'}`}>
    <div className="shop-utility"><span><b>Hatpull</b> <span>gift finder</span></span><GiftListButton/></div>
    {!store && <section className="shop-lobby" aria-labelledby={id+'-shops'}>
      <div className="shop-lobby-intro"><p className="eyebrow">Your favorite shops. One gift list.</p><h2 id={id+'-shops'}>Where would you like to shop?</h2><p>{profile?'Pick a store to see gift ideas. Your age, preferences and celebration budget come with you.':'Pick a store to start exploring. Your celebration’s budget comes with you.'}</p></div>
      <div className="shop-choices">{shops.map(shop=><button type="button" key={shop.id} ref={el=>{shopButtons.current[shop.id]=el;}} className={`shop-choice shop-choice-${shop.id}`} aria-label={shop.action} aria-describedby={id+'-'+shop.id+'-description'} disabled={busy||selectionDisabled} onClick={()=>choose(shop.id)}>
        <span className="shop-choice-heading"><StoreLogo store={shop.id}/><span className="shop-open">Available now</span></span>
        {shop.id==='ebay'?<EbayStorePreview budget={budget} currency={currency} disabled={disabled}/>:<span className="shop-choice-art" aria-hidden="true">{shop.art.map(art=><span key={art}><GiftArtwork kind={art}/></span>)}</span>}
        <span className="shop-choice-body" id={id+'-'+shop.id+'-description'}><b>{shop.label}</b><span>{shop.description}</span></span>
        <span className="shop-choice-action">{shop.action}<span aria-hidden="true">→</span></span>
      </button>)}</div>
      <p className="shop-lobby-note">Save your wishes in Hatpull. Purchases happen at the store.</p>
    </section>}
    {store && <div className="shop-navigation">
      <button type="button" className="shop-back" disabled={busy||selectionDisabled} onClick={()=>choose(null)}>← All shops</button>
      <div className="shop-selected-title"><h2 ref={heading} tabIndex={-1} aria-label={`${store==='ebay'?'eBay':'Amazon'} gift finds`}><StoreLogo store={store}/></h2><p>{store==='ebay'?'Search eBay listings. Save favorites to Hatpull.':'Browse on Amazon. Keep your wish-list link in Hatpull.'}</p></div>
      <button type="button" className="shop-switch" disabled={busy||selectionDisabled} onClick={()=>choose(store==='ebay'?'amazon':'ebay')}>Switch to {store==='ebay'?'Amazon':'eBay'} →</button>
    </div>}
    {contextPanel && <div className="shop-context">{contextPanel}</div>}
    {(visited.ebay||store==='ebay') && <div hidden={store!=='ebay'}><EbayGiftCatalog target={target} budget={budget} currency={currency} profile={profile} showPreferences={showPreferences} disabled={disabled} active={store==='ebay'} onBusy={working} onSaved={onSaved}/></div>}
    {(visited.amazon||store==='amazon') && <div hidden={store!=='amazon'}><AmazonGiftShop budget={budget} currency={currency} profile={profile}/>{amazonPanel && <div className="store-amazon-panel">{amazonPanel}</div>}</div>}
    {store!=='ebay' && <p className="shop-trademark">Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates.</p>}
  </div>;
}
