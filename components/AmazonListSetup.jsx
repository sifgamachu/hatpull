"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { rpc } from '@/lib/db';
import { getG } from '@/lib/store';
import { rid } from '@/lib/core';
import { amazonWishListFromInput, amazonWishListUrl } from '@/lib/amazon-wish-list.mjs';
import { giftContextId } from '@/lib/gift-intake.mjs';
import GiftBrowser from './GiftBrowser';

export default function AmazonListSetup({ target, initial, items, disabled = false, onBusy, onSaved }) {
  const inputId = useId(), writing = useRef(false), inputRef = useRef(null), loadVersion = useRef(0);
  const [value, setValue] = useState(initial?.u || ''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false), [another, setAnother] = useState(false), [snapshot, setSnapshot] = useState(null);
  const context = target?.mid ? giftContextId(target) : '', ready = !!context && !disabled;
  const lists = snapshot?.context === context ? snapshot.lists : [];
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { setSaved(false); setError(''); setAnother(false); }, [context]);
  useEffect(() => {
    if (!context) { setSnapshot(null); return; }
    let active = true, revision = 0;
    if (items) { setSnapshot({ context, lists: items.filter(w => amazonWishListUrl(w.u)) }); return; }
    async function load() {
      const current = ++revision, version = ++loadVersion.current;
      try {
        const tokens = getG(target.gid);
        const { state: s } = await rpc('hp_state_delta', { p_gid: target.gid, p_mtok: tokens?.mtok || null, p_atok: null, p_profile: target.mid, p_version: null });
        const member = s?.members.find(m => m.id === target.mid);
        const owned = s?.me && (member?.id === s.me.id || (member?.kid && member.parent_id === s.me.id));
        if (active && current === revision && version === loadVersion.current && !writing.current) setSnapshot({ context, lists: owned && Array.isArray(member.profile?.items) ? member.profile.items.filter(w => amazonWishListUrl(w.u)) : [] });
      } catch { /* The explicit save still verifies access and reports any failure. */ }
    }
    const wake = () => { if (!document.hidden && !writing.current) load(); };
    load(); window.addEventListener('focus', wake);
    return () => { active = false; revision++; window.removeEventListener('focus', wake); };
  }, [context, items]);
  async function save(text) {
    if (!ready || writing.current) return;
    writing.current = true; loadVersion.current++; setBusy(true); setError(''); setSaved(false);
    try {
      const wish = amazonWishListFromInput(text, rid(6)), tokens = getG(target.gid);
      const result = await rpc('hp_add_wish', { p_gid: target.gid, p_mtok: tokens?.mtok || null, p_target: target.mid, p_wish: wish });
      setSnapshot(previous => ({ context, lists: [...(previous?.context === context ? previous.lists : []).filter(w => w.id !== result.wish.id && amazonWishListUrl(w.u) !== wish.u), result.wish] }));
      setValue(''); setSaved(true); setAnother(false); await onSaved?.(result);
    } catch (e) {
      setError(/forbidden/.test(e.message) ? 'Open your participant invitation or sign in again to save to this list.' : /wish_list_full|too large/.test(e.message) ? 'Your Hatpull list is full. Remove an old wish before adding this link.' : /fetch|network|timeout|failed|Request/i.test(e.message) ? 'Couldn’t save yet. Your link is kept here; please try again.' : e.message);
    } finally { writing.current = false; setBusy(false); }
  }
  async function paste() {
    if (!ready || busy) return;
    setBusy(true); setError('');
    try {
      if (!navigator.clipboard?.readText) throw new Error('unavailable');
      const text = await navigator.clipboard.readText(); setValue(text.slice(0,8192)); await save(text);
    } catch { setError('Paste your Amazon wish-list link into the box, then choose Save my Amazon list.'); inputRef.current?.focus(); }
    finally { setBusy(false); }
  }
  const showForm = !lists.length || another || (!!initial && !!value);
  return <section className="amazon-list-setup stack" aria-label="Use an Amazon wish list">
    <div className="amazon-list-intro"><div><p className="eyebrow">Save once. Keep wishing.</p><h2>Use my Amazon wish list.</h2><p>Choose all your gifts on Amazon. Your gift-giver opens one list from Hatpull. No copying each product back here.</p></div><span className="amazon-list-badge" aria-hidden="true">1 link<br/><small>every gift</small></span></div>
    {lists.length > 0 && <div className="amazon-list-connected stack"><p role="status"><b>{saved ? '✓ Your Amazon list link is saved' : '✓ Amazon list link already saved'}</b></p><p className="small">Keep using <strong>Add to List</strong> on Amazon. Your gift-giver uses this same link to see your latest choices there.</p><div className="row">{lists.map(w => <a key={w.id} className="btn small ghost" href={amazonWishListUrl(w.u)} target="_blank" rel="noopener noreferrer nofollow">Open {lists.length === 1 ? 'my Amazon wish list' : w.t} ↗</a>)}<Link className="link small" href={`/g/${target.gid}/w/${target.mid}`}>View my Hatpull wish list →</Link></div>{!showForm && <button className="link small" onClick={() => setAnother(true)}>Add another Amazon list</button>}</div>}
    {showForm && <div className="amazon-list-columns"><div className="stack"><h3>One small setup. That’s it.</h3><ol className="amazon-list-steps"><li><b>Open or create your Amazon list.</b><span>Use a wish list for this celebration.</span></li><li><b>Choose Invite → View only → Copy link.</b><span>Paste that sharing link here once.</span></li><li><b>Keep adding gifts on Amazon.</b><span>Tap Add to List on any product. Your gift-giver sees your choices on that list.</span></li></ol><a className="btn small ghost" href="https://www.amazon.com/hz/wishlist/intro" target="_blank" rel="noopener noreferrer">Open my Amazon lists ↗</a></div><form className="stack amazon-list-form" onSubmit={e => { e.preventDefault(); save(value); }}>
      <div><label htmlFor={inputId}>Amazon wish-list sharing link</label><textarea id={inputId} ref={inputRef} rows={3} value={value} maxLength={8192} onChange={e => { setValue(e.target.value); setError(''); }} disabled={busy} placeholder="https://www.amazon.com/hz/wishlist/ls/…"/></div>
      {ready ? <p className="small muted">Saving for <strong>{target.person}</strong> in {target.name}.</p> : <p className="small muted">{target && disabled ? 'Checking your celebration…' : 'Choose your celebration and your name above first.'}</p>}
      <button type={value ? 'submit' : 'button'} className="btn" disabled={!ready || busy} onClick={value ? undefined : paste}>{busy ? 'Saving…' : value ? 'Save my Amazon list' : 'Paste & save my Amazon list'}</button>
      <p className="tiny muted">Use a view-only link so your gift-giver can browse without changing your list. Hatpull doesn’t change your Amazon sharing settings.</p>
    </form></div>}
    {error && <p className="note err" role="alert">{error}</p>}
    <p className="small muted">Your products, photos and current prices stay on Amazon. This saves a list link; it doesn’t import products or track Amazon purchases in Hatpull.</p>
    {lists.length > 0 && <GiftBrowser budget={target.budget} currency={target.cur} listMode compact/>}
  </section>;
}
