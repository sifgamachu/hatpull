"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGiftContexts } from '@/lib/useGiftContexts';
import { GIFT_CONTEXT_KEY, GIFT_DRAFT_KEY, chooseGiftContext, giftContextId, giftFromInput, readGiftDraft } from '@/lib/gift-intake.mjs';
import { money } from '@/lib/core';
import GiftStores from './GiftStores';
import { GiftListCartProvider, GiftListButton } from './GiftListCart';
import QuickWish from './QuickWish';
import GiftInstall from './GiftInstall';
import SignIn from './SignIn';
import AmazonListSetup from './AmazonListSetup';
import { amazonWishListUrl } from '@/lib/amazon-wish-list.mjs';

export default function GiftFinderWorkspace({ incoming = false }) {
  const { contexts, loading, failures, user, retry } = useGiftContexts();
  const [selected, setSelected] = useState(null), [shared, setShared] = useState(null), [error, setError] = useState(''), [signIn, setSignIn] = useState(false), [listBusy, setListBusy] = useState(false), [giftBusy, setGiftBusy] = useState(false), [catalogBusy,setCatalogBusy]=useState(false), [cartBusy,setCartBusy]=useState(false), [store,setStore]=useState(null);
  const busy = listBusy || giftBusy || catalogBusy || cartBusy;
  useEffect(() => {
    if (selected !== null || loading) return;
    let remembered = ''; try { remembered = localStorage.getItem(GIFT_CONTEXT_KEY); } catch {}
    setSelected(chooseGiftContext(contexts, remembered));
  }, [contexts, loading, selected]);
  useEffect(() => {
    if (!incoming) return;
    const url = new URL(location.href), input = Object.fromEntries(['url', 'text', 'title'].map(k => [k, url.searchParams.get(k) || '']));
    try {
      if (input.url || input.text || input.title) {
        const wish = giftFromInput(input); setShared(wish);
        try { localStorage.setItem(GIFT_DRAFT_KEY, JSON.stringify({ at: Date.now(), input: { url: wish.u, title: wish.t } })); } catch {}
      } else { try { setShared(readGiftDraft(localStorage)); } catch {} }
    } catch (e) { setError(e.message); }
    finally { ['url','text','title'].forEach(k => url.searchParams.delete(k)); history.replaceState(null, '', url.pathname + url.search); }
  }, [incoming]);
  const target = contexts.find(c => giftContextId(c) === selected);
  const sharedList = !!amazonWishListUrl(shared?.u);
  function clearSharedDraft() { try { localStorage.removeItem(GIFT_DRAFT_KEY); } catch {} }
  function choose(value) { setSelected(value); try { localStorage.setItem(GIFT_CONTEXT_KEY, value); } catch {} }
  const contextPanel = <section className="gift-context panel stack" aria-label="Choose your wish list">
      <div className="row between"><div><p className="eyebrow">Your gifts, saved together</p><h2>Your wish list & budget</h2></div>{target && <span className="pill">{target.budget ? `${money(target.cur, target.budget)} per gift` : 'No budget set'}</span>}</div>
      {contexts.length > 0 && <div><label htmlFor="gift-celebration">Celebration & wish list</label><select id="gift-celebration" value={target ? selected : ''} disabled={busy} onChange={e => choose(e.target.value)}><option value="">Choose your wish list…</option>{contexts.map(c => <option key={giftContextId(c)} value={giftContextId(c)}>{c.name} · {c.person}{c.budget ? ` · ${money(c.cur, c.budget)}` : ''}</option>)}</select></div>}
      {loading && <p className="small muted" role="status">Checking your celebrations and budgets…</p>}
      {!loading && !contexts.length && <><p>Browse freely. Open your participant invitation{!user && ' or sign in'} to save gifts.</p><div className="row">{!user && <button className="btn small" onClick={() => setSignIn(true)}>Sign in to find my lists</button>}<Link className="btn small ghost" href="/my">My celebrations</Link></div></>}
      {failures > 0 && <p className="small note" role="status">Some celebrations couldn’t load. <button className="link" onClick={retry}>Try again</button></p>}
      {target && <p className="small muted"><span>Tap <b>Your gift list</b> to see everything you’ve saved.</span></p>}
    </section>;
  return <GiftListCartProvider key={`${user?.id||'guest'}:${selected||'none'}`} target={target} showDock={incoming||!!store} browseHint={store==='amazon'?{title:'Choosing gifts on Amazon?',text:'Link your Amazon wish list once below.'}:undefined} contextLoading={loading||selected===null} disabled={loading||listBusy||giftBusy||catalogBusy} onBusy={setCartBusy}><div className="stack gift-workspace gift-cart-workspace">
    {incoming && contextPanel}
    {error && <p className="note err" role="alert">{error}</p>}
    {!incoming && <GiftStores store={store} onStoreChange={setStore} contextPanel={contextPanel} target={target} budget={target?.budget} currency={target?.cur} disabled={loading||listBusy||giftBusy||cartBusy} onBusy={setCatalogBusy} amazonPanel={<AmazonListSetup target={target} disabled={loading||giftBusy||catalogBusy||cartBusy} onBusy={setListBusy} onSaved={clearSharedDraft}/>}/>}
    {incoming && <GiftListButton/>}
    {incoming && sharedList && <AmazonListSetup key={shared.u} target={target} initial={shared} disabled={loading||giftBusy||cartBusy} onBusy={setListBusy} onSaved={clearSharedDraft}/>}
    <details className="individual-gifts" open={(incoming && !sharedList) || undefined}><summary>{incoming && !sharedList ? 'Save this individual gift' : 'Or add individual gifts from any store'}</summary>
    <div className="stack">
      <QuickWish key={shared?.u || 'new'} target={target} initial={sharedList ? null : shared} disabled={loading || listBusy || catalogBusy || cartBusy} onBusy={setGiftBusy} onSaved={clearSharedDraft}/>
      <GiftInstall/>
    </div>
    </details>
    {incoming && !shared && !error && <p className="small muted">Share a product link to Hatpull from a supported installed browser, or paste a link above.</p>}
    {signIn && <SignIn close={() => setSignIn(false)} next={incoming ? '/share-gift' : '/gift-finder'} why="Restore your linked wish lists and celebration budgets." onSignedIn={() => { setSignIn(false); setSelected(null); retry(); }}/>}
  </div></GiftListCartProvider>;
}
