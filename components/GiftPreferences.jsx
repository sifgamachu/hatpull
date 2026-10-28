"use client";
import { useId, useState } from 'react';
import { Sheet } from './Sheet';
import { GIFT_GENDERS, GIFT_INTERESTS, cleanGiftPreferences, emptyGiftPreferences, giftPreferenceChips } from '@/lib/gift-preferences.mjs';
import AgeChoice from './AgeChoice';

export default function GiftPreferences({ value, onChange, budget, disabled = false }) {
  const id = useId(), [draft, setDraft] = useState(null), [ageValid, setAgeValid] = useState(true);
  const chips = giftPreferenceChips(value);
  function open() { setDraft(cleanGiftPreferences(value)); setAgeValid(true); }
  function toggle(interest) {
    setDraft(p => ({ ...p, interests: p.interests.includes(interest) ? p.interests.filter(x => x !== interest) : [...p.interests, interest].slice(0, 3) }));
  }
  function remove(chip) { onChange(chip.kind === 'interest' ? { ...value, interests: value.interests.filter(x => x !== chip.id) } : { ...value, [chip.kind]: 'any' }); }
  return <div className="gift-preferences">
    <div className="gift-preferences-intro"><div><h3>Find something that feels like them</h3><p>Choose who you’re shopping for and what they enjoy.</p></div><button type="button" className="preference-open" onClick={open} disabled={disabled} aria-haspopup="dialog">{chips.length ? 'Edit preferences' : 'Choose gift preferences'} <span aria-hidden="true">→</span></button></div>
    {chips.length > 0 && <div className="preference-chips" aria-label="Active gift preferences">{chips.map(chip => <button type="button" key={chip.kind + chip.id} disabled={disabled} onClick={() => remove(chip)} aria-label={'Remove ' + chip.label}>{chip.label}<span aria-hidden="true">×</span></button>)}<button type="button" className="preference-clear" disabled={disabled} onClick={() => onChange({...emptyGiftPreferences(),country:value.country})}>Clear preferences</button></div>}
    {draft && <Sheet className="gift-preference-sheet personal-info-sheet" onClose={() => setDraft(null)}>
      <div className="preference-sheet-header"><div><p className="eyebrow">A little about them</p><h2>Find gifts they’ll love</h2></div><button type="button" className="gift-cart-close" aria-label="Close gift preferences" onClick={() => setDraft(null)}>×</button></div>
      <p className="preference-budget">{budget > 0 ? `Up to $${budget} per item` : 'Any item price'} <span>Shipping and tax may be extra.</span></p>
      <AgeChoice label="What is their age?" value={draft.age} emptyValue="any" onChange={age=>setDraft(p=>({...p,age}))} onValidityChange={setAgeValid}/>
      <fieldset><legend>Gift ideas for</legend><div className="preference-options">{GIFT_GENDERS.map(([key, label]) => <label key={key} className="preference-option"><input type="radio" name={id + '-gender'} value={key} checked={draft.gender === key} onChange={() => setDraft(p => ({ ...p, gender: key }))}/><span>{label}</span></label>)}</div></fieldset>
      <details className="personal-info-interests"><summary>Add interests</summary><fieldset><legend>Pick up to three interests</legend><div className="preference-options interest-options">{GIFT_INTERESTS.map(([key, label]) => <label key={key} className="preference-option"><input type="checkbox" checked={draft.interests.includes(key)} disabled={draft.interests.length >= 3 && !draft.interests.includes(key)} onChange={() => toggle(key)}/><span>{label}</span></label>)}</div></fieldset></details>
      <div className="preference-sheet-footer"><button type="button" className="btn" disabled={!ageValid} onClick={() => {onChange(cleanGiftPreferences(draft));setDraft(null);}}>Continue <span aria-hidden="true">→</span></button></div>
    </Sheet>}
  </div>;
}
