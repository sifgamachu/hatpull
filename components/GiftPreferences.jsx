"use client";
import { useId, useState } from 'react';
import { Sheet } from './Sheet';
import { GIFT_GENDERS, GIFT_INTERESTS, cleanGiftPreferences, emptyGiftPreferences, giftPreferenceChips } from '@/lib/gift-preferences.mjs';
import AgeChoice from './AgeChoice';

export default function GiftPreferences({ value, onChange, budget, disabled = false }) {
  const id = useId(), [draft, setDraft] = useState(null), [step, setStep] = useState(0), [ageValid, setAgeValid] = useState(true);
  const chips = giftPreferenceChips(value);
  function open() { setDraft(cleanGiftPreferences(value)); setStep(0); setAgeValid(true); }
  function toggle(interest) {
    setDraft(p => ({ ...p, interests: p.interests.includes(interest) ? p.interests.filter(x => x !== interest) : [...p.interests, interest].slice(0, 3) }));
  }
  function remove(chip) { onChange(chip.kind === 'interest' ? { ...value, interests: value.interests.filter(x => x !== chip.id) } : { ...value, [chip.kind]: 'any' }); }
  return <div className="gift-preferences">
    <div className="gift-preferences-intro"><div><h3>Find something that feels like them</h3><p>Choose who you’re shopping for and what they enjoy.</p></div><button type="button" className="preference-open" onClick={open} disabled={disabled} aria-haspopup="dialog">{chips.length ? 'Edit preferences' : 'Choose gift preferences'} <span aria-hidden="true">→</span></button></div>
    {chips.length > 0 && <div className="preference-chips" aria-label="Active gift preferences">{chips.map(chip => <button type="button" key={chip.kind + chip.id} disabled={disabled} onClick={() => remove(chip)} aria-label={'Remove ' + chip.label}>{chip.label}<span aria-hidden="true">×</span></button>)}<button type="button" className="preference-clear" disabled={disabled} onClick={() => onChange({...emptyGiftPreferences(),country:value.country})}>Clear preferences</button></div>}
    {draft && <Sheet className="gift-preference-sheet" onClose={() => setDraft(null)}>
      <div className="preference-sheet-header"><div><p className="eyebrow">Step {step + 1} of 2 · gift inspiration</p><h2>{step === 0 ? 'Who is the gift for?' : 'What do they enjoy?'}</h2></div><button type="button" className="gift-cart-close" aria-label="Close gift preferences" onClick={() => setDraft(null)}>×</button></div>
      <p className="preference-budget">{budget > 0 ? `Up to $${budget} per item` : 'Any item price'} <span>Shipping and tax may be extra.</span></p>
      {step === 0 ? <>
        <p className="small muted">Choose an age to find gifts that fit. Explore any category you like.</p>
        <fieldset><legend>Gift ideas for</legend><div className="preference-options">{GIFT_GENDERS.map(([key, label]) => <label key={key} className="preference-option"><input type="radio" name={id + '-gender'} value={key} checked={draft.gender === key} onChange={() => setDraft(p => ({ ...p, gender: key }))}/><span>{label}</span></label>)}</div></fieldset>
        <AgeChoice value={draft.age} emptyValue="any" onChange={age=>setDraft(p=>({...p,age}))} onValidityChange={setAgeValid}/>
      </> : <fieldset><legend>Pick up to three interests</legend><p className="small muted">We’ll look for gifts across your selected interests.</p><div className="preference-options interest-options">{GIFT_INTERESTS.map(([key, label]) => <label key={key} className="preference-option"><input type="checkbox" checked={draft.interests.includes(key)} disabled={draft.interests.length >= 3 && !draft.interests.includes(key)} onChange={() => toggle(key)}/><span>{label}</span></label>)}</div><p className="small muted" role="status">{draft.interests.length} of 3 selected. {draft.interests.length === 3 ? 'Uncheck one to choose another.' : 'Skip this step to see broader ideas.'}</p></fieldset>}
      <div className="preference-sheet-footer">{step === 1 && <button type="button" className="btn ghost" onClick={() => setStep(0)}>← Back</button>}<button type="button" className="btn" disabled={!ageValid} onClick={() => { if (step === 0) setStep(1); else { onChange(cleanGiftPreferences(draft)); setDraft(null); } }}>{step === 0 ? 'Next: interests' : 'Show gifts'}</button></div>
    </Sheet>}
  </div>;
}
