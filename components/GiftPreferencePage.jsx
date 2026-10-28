"use client";
import { useId, useState } from 'react';
import AgeChoice from './AgeChoice';
import { GIFT_GENDERS, GIFT_INTERESTS, giftPreferenceChips } from '@/lib/gift-preferences.mjs';
import { GIFT_COUNTRIES } from '@/lib/gift-delivery.mjs';
import { money } from '@/lib/core';

export default function GiftPreferencePage({ value, onChange, onContinue, budget, currency='$', disabled=false, showDemographics=true, contextPanel, headingRef }) {
  const id=useId(), [ageValid,setAgeValid]=useState(true);
  const toggle=interest=>onChange({...value,interests:value.interests.includes(interest)?value.interests.filter(x=>x!==interest):[...value.interests,interest].slice(0,3)});
  return <section className="gift-preference-page" aria-labelledby={id+'-title'}>
    <header><p className="eyebrow">Step 1 of 2 · Make it personal</p><span className="gift-preference-present" aria-hidden="true">🎁</span><h1 id={id+'-title'} ref={headingRef} tabIndex={-1}>Find something that feels like them</h1><p>A few little details help us find gifts they’ll love.</p></header>
    {budget>0&&<p className="gift-preference-budget">{money(currency,budget)} celebration budget <span>Comes with you to the shops</span></p>}
    {showDemographics?<>
      <AgeChoice label="What is their age?" value={value.age} emptyValue="any" onChange={age=>onChange({...value,age})} onValidityChange={setAgeValid} disabled={disabled}/>
      <fieldset disabled={disabled}><legend>Gift ideas for</legend><div className="preference-options">{GIFT_GENDERS.map(([key,label])=><label key={key} className="preference-option"><input type="radio" name={id+'-gender'} checked={value.gender===key} onChange={()=>onChange({...value,gender:key})}/><span>{label}</span></label>)}</div></fieldset>
    </>:<div className="gift-preference-summary">{giftPreferenceChips({...value,interests:[]}).map(chip=><span key={chip.kind}>{chip.label}</span>)}</div>}
    <fieldset className="gift-page-interests" disabled={disabled}><legend>What are they into? <span>Pick up to 3</span></legend><div className="preference-options interest-options">{GIFT_INTERESTS.map(([key,label])=><label key={key} className="preference-option"><input type="checkbox" checked={value.interests.includes(key)} disabled={value.interests.length>=3&&!value.interests.includes(key)} onChange={()=>toggle(key)}/><span>{label}</span></label>)}</div></fieldset>
    <div className="gift-page-country"><label htmlFor={id+'-country'}>Ship gifts to</label><select id={id+'-country'} value={value.country} disabled={disabled} onChange={e=>onChange({...value,country:e.target.value})}>{GIFT_COUNTRIES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></div>
    {contextPanel&&<details className="gift-page-context"><summary>Choose a wish list & celebration budget</summary>{contextPanel}</details>}
    <footer><button type="button" className="btn gift-preference-continue" disabled={disabled||!ageValid} onClick={onContinue}>Continue <span aria-hidden="true">→</span></button><p>Next: choose your favorite store</p></footer>
  </section>;
}
