"use client";
import { useEffect, useRef, useState } from 'react';
import { saveButtonCode, noteStoreTrip, readStoreTrip, clearStoreTrip, storeFromHref } from '@/lib/save-button.mjs';
import { Sheet } from './Sheet';
import QuickWish from './QuickWish';

const touchDevice = () => typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent));

// Drag-to-bookmarks "Save to Hatpull" button for computers, and the Share → Copy link steps for phones.
export function SaveButtonInstall({ compact = false }) {
  const ref = useRef(null), [phone, setPhone] = useState(false), [copied, setCopied] = useState(false), [hint, setHint] = useState(false);
  useEffect(() => {
    setPhone(touchDevice());
    // React refuses javascript: hrefs in markup, so the bookmarklet is attached after render.
    ref.current?.setAttribute('href', saveButtonCode(location.origin));
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(saveButtonCode(location.origin)); setCopied(true); } catch { setCopied(false); }
  }
  return <section className={'bring-back stack' + (compact ? ' compact' : '')} aria-label="Bring gifts back from Amazon">
    <div><p className="eyebrow">No more copy, switch tabs, paste</p><h3>Save gifts straight from Amazon.</h3></div>
    {!phone ? <>
      <ol className="bring-back-steps">
        <li><b>Drag this button to your bookmarks bar</b> (one time):
          <span className="bring-back-drag"><a ref={ref} className="save-button-chip" onClick={e => { e.preventDefault(); setHint(true); }} draggable="true">🎁 Save to Hatpull</a></span>
          {hint && <span className="small" role="status">Drag the button up to your bookmarks bar instead of clicking it here. Then click it on a product page.</span>}
          <span className="tiny muted">Don’t see a bookmarks bar? Press Ctrl+Shift+B (⌘+Shift+B on Mac).</span></li>
        <li><b>On any Amazon product, click “Save to Hatpull.”</b><span>A small Hatpull window opens with the gift filled in.</span></li>
        <li><b>Tap Save.</b><span>It lands on your wish list, and your gift-giver can reserve it.</span></li>
      </ol>
      <button type="button" className="link small" onClick={copy}>{copied ? '✓ Button code copied. Add a new bookmark and paste it as the URL.' : 'Can’t drag? Copy the button code instead'}</button>
    </> : <ol className="bring-back-steps">
      <li><b>On the Amazon product, tap Share → Copy link.</b><span>In the Amazon app or in your browser.</span></li>
      <li><b>Come back to Hatpull.</b><span>We’ll be waiting with a <b>Paste & save</b> button.</span></li>
      <li><b>One tap and it’s saved.</b><span>Your gift-giver sees it and can reserve it secretly.</span></li>
    </ol>}
    <p className="tiny muted">Only the product link and name are sent to Hatpull, and only when you choose to save. Works on other stores too.</p>
  </section>;
}

// When someone leaves for a store and comes back, offer to paste what they copied.
export function StoreReturnPrompt({ target, disabled }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const leave = e => {
      const a = e.target?.closest?.('a[href]');
      if (!a || a.target !== '_blank') return;
      const store = storeFromHref(a.href);
      if (store) noteStoreTrip(sessionStorage, store);
    };
    const back = () => {
      if (document.hidden) return;
      const trip = readStoreTrip(sessionStorage);
      if (!trip || Date.now() - trip.at < 4000) return;
      clearStoreTrip(sessionStorage);
      let lastSave = 0; try { lastSave = Number(localStorage.getItem('hatpull.gift-saved')) || 0; } catch {}
      if (lastSave < trip.at) setOpen(trip.store);
    };
    document.addEventListener('click', leave, true);
    document.addEventListener('visibilitychange', back); window.addEventListener('focus', back);
    return () => { document.removeEventListener('click', leave, true); document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); };
  }, []);
  if (!open || !target?.mid) return null;
  const name = open === 'amazon' ? 'Amazon' : 'eBay';
  return <Sheet className="store-return" onClose={() => setOpen(null)}>
    <div><p className="eyebrow">Welcome back from {name}</p><h2>Found something? Save it now.</h2><p className="small muted">Copied a product link on {name}? Tap <b>Paste & save gift</b>. Nothing copied yet? Go back to the product, copy its link (<b>Share → Copy link</b>, or the address at the top of your browser), then return here. Adding it to your Amazon cart or list doesn’t copy it.</p><p className="small muted">On a computer, the <b>🎁 Save to Hatpull</b> bookmark button below skips copying altogether.</p></div>
    <QuickWish target={target} disabled={disabled} source="return" bare onSaved={() => {}}/>
    <button className="btn ghost small" onClick={() => setOpen(null)}>Not now</button>
  </Sheet>;
}
