"use client";
import { useEffect, useId, useState } from 'react';
import { EXACT_AGES, exactAge } from '@/lib/gift-preferences.mjs';

export default function AgeChoice({ value = '', onChange, disabled = false, emptyValue = '', onValidityChange }) {
  const id = useId(), [entry, setEntry] = useState(null);
  const editing = entry?.forValue === value;
  const text = editing ? entry.text : exactAge(value);
  const age = text.trim(), valid = age === '' || exactAge(age) !== '';
  const legacy = value !== emptyValue && exactAge(value) === '';
  useEffect(() => { onValidityChange?.(valid); }, [valid, onValidityChange]);
  function commit() {
    // Save a complete number on blur/Enter, not a separate request per digit.
    if (!editing || !valid) return;
    const next = age === '' ? emptyValue : age;
    setEntry(null);
    if (next !== value) onChange(next);
  }
  return <div className="age-choice">
    <div className="age-choice-fields">
      <div><label htmlFor={id+'-typed'}>Age (years)</label><input id={id+'-typed'} type="text" inputMode="numeric" autoComplete="off" placeholder="Type age" maxLength={3} value={text} disabled={disabled} aria-invalid={!valid} aria-describedby={id+'-help'+(!valid?' '+id+'-error':'')} onChange={e=>setEntry({forValue:value,text:e.target.value})} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){setEntry(null);}}}/></div>
      <span className="age-choice-or" aria-hidden="true">or</span>
      <div><label htmlFor={id+'-list'}>Choose from the list</label><select id={id+'-list'} value={value} disabled={disabled} onChange={e=>{setEntry(null);onChange(e.target.value);}}><option value={emptyValue}>Any age · optional</option>{legacy&&<option value={value}>Saved age group: {value}</option>}{EXACT_AGES.map(n=><option key={n} value={n}>{n} {n==='1'?'year':'years'} old</option>)}</select></div>
    </div>
    <p id={id+'-help'} className="small muted">Type an age from 0–120, or scroll the list. Age is optional.</p>
    {!valid&&<p id={id+'-error'} className="age-choice-error" role="alert">Enter a whole number from 0 to 120, or choose an age from the list.</p>}
  </div>;
}
