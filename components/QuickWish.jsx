"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useGiftListCart } from './GiftListCart';
import { rpc } from '@/lib/db';
import { getG } from '@/lib/store';
import { rid } from '@/lib/core';
import { giftFromInput } from '@/lib/gift-intake.mjs';

export default function QuickWish({ target, initial, onSaved, onBusy, disabled = false }) {
  const cart = useGiftListCart();
  const inputId = useId(), inputRef = useRef(null), writing = useRef(false);
  const [value, setValue] = useState(initial?.u || ''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(null);
  const ready = !!target?.mid && !disabled;
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { setSaved(null); setError(''); }, [target?.gid, target?.mid]);
  async function save(text, shared = false) {
    if (!ready || writing.current) return;
    writing.current = true; setBusy(true); setError(''); setSaved(null);
    try {
      const wish = giftFromInput(shared && initial && text === initial.u ? { url: text, title: initial.t } : text, rid(6));
      const tokens = getG(target.gid);
      const result = await rpc('hp_add_wish', { p_gid: target.gid, p_mtok: tokens?.mtok || null, p_target: target.mid, p_wish: wish });
      cart?.saved(result);
      setValue(''); setSaved({ ...result, target }); await onSaved?.(result);
    } catch (e) {
      setError(/forbidden/.test(e.message) ? 'Open your participant invitation or sign in again to save to this wish list.' : /wish_list_full|too large/.test(e.message) ? 'Your wish list is full. Remove a gift or shorten a few notes first.' : /fetch|network|timeout|failed|Request/i.test(e.message) ? 'Couldn’t save yet. Your link is kept here. Try again.' : e.message);
    } finally { writing.current = false; setBusy(false); }
  }
  async function pasteAndSave() {
    if (!ready || busy) return;
    setError(''); setBusy(true);
    try {
      if (!navigator.clipboard?.readText) throw new Error('unavailable');
      const text = await navigator.clipboard.readText(); setValue(text.slice(0, 8192)); await save(text);
    } catch { setError('Paste the copied link into the box below, then choose Save gift.'); inputRef.current?.focus(); }
    finally { setBusy(false); }
  }
  return <section className="quick-wish stack" aria-label="Save a gift link">
    <div><p className="eyebrow">Found something you love?</p><h3>{initial && !saved ? 'Your shared gift is ready' : 'One link. On your wish list.'}</h3><p className="small muted">Save the link now. Add a name, size or color whenever you like.</p></div>
    {ready && <p className="quick-target small">Saving to <strong>{target.person || 'your wish list'}</strong> · {target.name}</p>}
    {initial && value === initial.u && !saved && <p><strong>{initial.t}</strong></p>}
    <form className="stack" onSubmit={e => { e.preventDefault(); save(value, true); }}>
      {!value && <button type="button" className="btn" disabled={!ready || busy} onClick={pasteAndSave}>{busy ? 'Saving…' : 'Paste & save gift'}</button>}
      <div><label htmlFor={inputId}>{value ? 'Product link or shared text' : 'Or paste a product link here'}</label><textarea ref={inputRef} id={inputId} rows={2} maxLength={8192} value={value} onChange={e => { setValue(e.target.value); setError(''); setSaved(null); }} placeholder="Amazon Share link, product URL, or a link from any store" disabled={busy}/></div>
      {value && <button className="btn" type="submit" disabled={!ready || busy}>{busy ? 'Saving…' : 'Save gift to my wish list'}</button>}
    </form>
    {!ready && <p className="small muted">{target ? 'You need your own participant wish list to save a gift. Open your invitation and choose your name.' : 'Choose your celebration above to save to the right wish list.'}</p>}
    {error && <p className="note err" role="alert">{error}</p>}
    {saved && <div className="quick-saved" role="status"><b>{saved.added ? '✓ Saved to your wish list' : '✓ Already on your wish list'}</b><span>{saved.wish.t}</span><button className="link" onClick={cart?.show} hidden={!cart}>View your gift list →</button>{!cart&&<Link className="link" href={`/g/${saved.target.gid}/w/${saved.target.mid}?edit=${encodeURIComponent(saved.wish.id)}`}>View gift or add size & color →</Link>}</div>}
    <p className="tiny muted">Your gift-giver can open the exact product from your list. This saves a wish; it does not place an order.</p>
  </section>;
}
