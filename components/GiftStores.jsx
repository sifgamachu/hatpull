"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import EbayGiftCatalog from './EbayGiftCatalog';
import EbayStorePreview from './EbayStorePreview';
import StoreIdeaPreview from './StoreIdeaPreview';
import GiftPreferencePage from './GiftPreferencePage';
import { cleanGiftPreferences, giftPreferencesFromProfile, giftSearchQuery, giftPreferenceChips } from '@/lib/gift-preferences.mjs';
import { AMAZON_DISCLOSURE, AFF_REL, amazonUrl } from '@/lib/core';
import { positiveMoney } from '@/lib/gifts.mjs';
import { GiftListButton, useGiftListCart } from './GiftListCart';

const shops = [
  { id: 'ebay', name: 'eBay', label: 'Search & save right here', description: 'Discover real finds, see prices and add gifts to your list in one tap.', art: ['tech','games','coffee'], action: 'Shop eBay' },
  { id: 'amazon', name: 'Amazon', label: 'Browse gifts on Amazon', description: 'Go straight to Amazon to explore gifts for your preferences and budget. Opens in a new tab.', art: ['cozy','coffee','books'], action: 'Shop Amazon' },
];

function StoreLogo({store}) {
  return store==='ebay'
    ? <img className="shop-logo shop-logo-ebay" src="/stores/ebay.svg" alt="eBay" width="288" height="288"/>
    : <img className="shop-logo shop-logo-amazon" src="/stores/amazon-available-white.png" alt="Available at Amazon" width="1500" height="723"/>;
}

export default function GiftStores({target,budget,currency,disabled,onBusy,onSaved,amazonPanel,contextPanel,profile,showPreferences=true,selectionDisabled=false,store:controlledStore,onStoreChange,preferenceStep:controlledPreferenceStep,onPreferenceStepChange}) {
  const cart=useGiftListCart(), baseProfile=profile??cart?.profile;
  const basePreferences=giftPreferencesFromProfile(baseProfile);
  const preferenceContext=JSON.stringify([target?.gid,target?.mid,basePreferences]);
  const [matching,setMatching]=useState(null);
  const preferences=matching?.context===preferenceContext?matching.value:basePreferences;
  const browsingProfile={age:preferences.age,who:preferences.gender,interests:preferences.interests,country:preferences.country};
  const updatePreferences=value=>setMatching({context:preferenceContext,value:cleanGiftPreferences(value)});
  const [localPreferenceStep,setLocalPreferenceStep]=useState(false);
  const preferenceStep=controlledPreferenceStep??localPreferenceStep;
  const [shopsVisited,setShopsVisited]=useState(!preferenceStep);
  const preferenceHeading=useRef(null),lobbyHeading=useRef(null),previousStep=useRef(preferenceStep);
  function changePreferenceStep(next){if(onPreferenceStepChange)onPreferenceStepChange(next);else setLocalPreferenceStep(next);}
  useEffect(()=>{
    if(!preferenceStep)setShopsVisited(true);
    if(previousStep.current===preferenceStep)return;
    previousStep.current=preferenceStep;
    const heading=(preferenceStep?preferenceHeading:lobbyHeading).current;
    heading?.focus({preventScroll:true});
    heading?.scrollIntoView({block:'start',behavior:'instant'});
  },[preferenceStep]);
  // Amazon gets a broad recipient search, not eBay's comma-based OR syntax.
  const amazonQuery=giftSearchQuery('gift ideas',{...preferences,interests:preferences.interests.slice(0,1)});
  const amazonHref=amazonUrl(amazonQuery,0,(!currency||currency==='$')?positiveMoney(budget):0);
  const previewsLoading=disabled||cart?.contextLoading||(!!target&&profile===undefined&&!cart?.profileReady);
  const [localStore,setLocalStore]=useState(null),[busy,setBusy]=useState(false),[visited,setVisited]=useState({}),[amazonListOpened,setAmazonListOpened]=useState(false);
  const store=controlledStore===undefined?localStore:controlledStore;
  const amazonLinkProps={href:busy||selectionDisabled?undefined:amazonHref,target:'_blank',rel:AFF_REL,role:'link','aria-disabled':busy||selectionDisabled||undefined};
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
  return <div className={`gift-stores shop-theme-${store||'lobby'}${preferenceStep?' is-preference-step':''}`}>
    {preferenceStep&&<GiftPreferencePage value={preferences} onChange={updatePreferences} onContinue={()=>changePreferenceStep(false)} headingRef={preferenceHeading} budget={budget} currency={currency} disabled={previewsLoading||busy||selectionDisabled} showDemographics={showPreferences} contextPanel={contextPanel}/>}
    {(shopsVisited||!preferenceStep)&&<div hidden={preferenceStep}>
    <div className="shop-utility"><span><b>Hatpull</b> <span>gift finder</span></span><GiftListButton/></div>
    {!store && <section className="shop-lobby" aria-labelledby={id+'-shops'}>
      <div className="shop-lobby-intro"><p className="eyebrow">Your favorite shops. One gift list.</p><h2 ref={lobbyHeading} id={id+'-shops'} tabIndex={-1}>Where would you like to shop?</h2><p>{profile?'Pick a store to see gift ideas. Your age, preferences and celebration budget come with you.':'Pick a store to start exploring. Your celebration’s budget comes with you.'}</p></div>
      <div className="shop-preference-recap"><div><span className="eyebrow">Picked around your preferences</span><div className="gift-preference-summary">{giftPreferenceChips(preferences).map(chip=><span key={chip.kind+chip.id}>{chip.label}</span>)}{!giftPreferenceChips(preferences).length&&<span>Gifts for everyone</span>}</div></div><button type="button" className="btn small ghost" disabled={busy||selectionDisabled} onClick={()=>changePreferenceStep(true)}>Edit preferences</button></div>
      <div className="shop-choices">{shops.map(shop=>{const Card=shop.id==='amazon'?'a':'button';return <Card key={shop.id} {...(shop.id==='amazon'?amazonLinkProps:{type:'button',disabled:busy||selectionDisabled,onClick:()=>choose(shop.id)})} ref={el=>{shopButtons.current[shop.id]=el;}} className={`shop-choice shop-choice-${shop.id}`} aria-label={shop.action} aria-describedby={id+'-'+shop.id+'-description'}>
        <span className="shop-choice-heading"><StoreLogo store={shop.id}/><span className="shop-open">Available now</span></span>
        {shop.id==='ebay'?<EbayStorePreview budget={budget} currency={currency} profile={browsingProfile} disabled={preferenceStep||previewsLoading}/>:<StoreIdeaPreview profile={browsingProfile}/>}
        <span className="shop-choice-body" id={id+'-'+shop.id+'-description'}><b>{shop.label}</b><span>{shop.description}</span></span>
        <span className="shop-choice-action">{shop.action}<span aria-hidden="true">{shop.id==='amazon'?'↗':'→'}</span></span>
      </Card>;})}</div>
      <p className="shop-lobby-note">Save your wishes in Hatpull. Purchases happen at the store.</p>
      <p className="shop-affiliate-note">{AMAZON_DISCLOSURE} {currency&&currency!=='$'&&'Amazon.com prices are US$; set your price filter on Amazon. '}{preferences.country!=='US'&&'Confirm delivery to your country on Amazon.'}</p>
    </section>}
    {store && <div className="shop-navigation">
      <button type="button" className="shop-back" disabled={busy||selectionDisabled} onClick={()=>choose(null)}>← All shops</button>
      <div className="shop-selected-title"><h2 ref={heading} tabIndex={-1} aria-label={`${store==='ebay'?'eBay':'Amazon'} gift finds`}><StoreLogo store={store}/></h2><p>{store==='ebay'?'Search eBay listings. Save favorites to Hatpull.':'Browse on Amazon. Keep your wish-list link in Hatpull.'}</p></div>
      <a className="shop-switch" {...amazonLinkProps}>Shop Amazon ↗</a>
    </div>}
    {contextPanel && !preferenceStep && <div className="shop-context">{contextPanel}</div>}
    {(visited.ebay||store==='ebay') && <div hidden={store!=='ebay'}><EbayGiftCatalog target={target} budget={budget} currency={currency} profile={browsingProfile} showPreferences={showPreferences} onPreferencesChange={updatePreferences} disabled={disabled} active={!preferenceStep&&store==='ebay'} onBusy={working} onSaved={onSaved}/></div>}
    {amazonPanel && <details className="shop-amazon-list" onToggle={e=>{if(e.currentTarget.open)setAmazonListOpened(true);}}><summary>Already have an Amazon wish list?</summary>{amazonListOpened&&<div className="store-amazon-panel">{amazonPanel}</div>}</details>}
    {store!=='ebay' && <p className="shop-trademark">Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates.</p>}
    </div>}
  </div>;
}
