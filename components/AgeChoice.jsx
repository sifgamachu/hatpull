"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { EXACT_AGES, exactAge, GIFT_AGES } from '@/lib/gift-preferences.mjs';

export default function AgeChoice({ value = '', onChange, disabled = false, emptyValue = '', onValidityChange, label = 'Age (years)' }) {
  const id = useId(), input = useRef(null), options = useRef([]);
  const [entry, setEntry] = useState(null), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const editing = entry?.forValue === value;
  const text = editing ? entry.text : exactAge(value);
  const age = text.trim(), valid = age === '' || exactAge(age) !== '';
  const expanded = open && !disabled;
  const legacy = value !== emptyValue && exactAge(value) === '';
  const legacyLabel = GIFT_AGES.find(([key])=>key===value)?.[1] || value;
  useEffect(() => { onValidityChange?.(valid); }, [valid, onValidityChange]);
  useEffect(() => { if (expanded && active >= 0) options.current[active]?.scrollIntoView({block:'nearest'}); }, [expanded, active]);
  function save(next) {
    setEntry(null);
    if (next !== value) onChange(next);
  }
  function commit() {
    // Save a complete number on blur/Enter, not a separate request per digit.
    if (editing && valid) save(age === '' ? emptyValue : age);
  }
  function pick(index) {
    save(EXACT_AGES[index]);
    setOpen(false);
    input.current?.focus();
  }
  function keyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      setActive(expanded && active >= 0 ? Math.max(0,Math.min(120,active+direction)) : exactAge(age) !== '' ? +age : direction > 0 ? 0 : 120);
      setOpen(true);
    } else if (expanded && (e.key === 'Home' || e.key === 'End')) {
      e.preventDefault(); setActive(e.key === 'Home' ? 0 : 120);
    } else if (e.key === 'Tab') {
      commit(); setOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (expanded && active >= 0) pick(active); else { commit(); setOpen(false); }
    } else if (e.key === 'Escape' && (expanded || editing)) {
      e.preventDefault(); e.stopPropagation(); setEntry(null); setOpen(false);
    }
  }
  return <div className="age-choice" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){commit();setOpen(false);}}}>
    <label htmlFor={id+'-age'}>{label}</label>
    <div className="age-combobox">
      <div className="age-choice-control">
        <input ref={input} id={id+'-age'} type="text" role="combobox" inputMode="numeric" autoComplete="off" placeholder={legacy?legacyLabel:'Enter or choose age'} maxLength={3} value={text} disabled={disabled} aria-expanded={expanded} aria-controls={expanded?id+'-ages':undefined} aria-autocomplete="none" aria-activedescendant={expanded&&active>=0?id+'-option-'+active:undefined} aria-invalid={!valid} aria-describedby={id+'-help'+(!valid?' '+id+'-error':'')} onChange={e=>{setEntry({forValue:value,text:e.target.value});setActive(exactAge(e.target.value)!==''?+e.target.value:-1);setOpen(true);}} onKeyDown={keyDown}/>
        {text!=='' && valid && <span className="age-choice-unit" aria-hidden="true">{age==='1'?'year old':'years old'}</span>}
        <button type="button" className="age-choice-toggle" aria-label="Choose age from list" aria-expanded={expanded} aria-controls={expanded?id+'-ages':undefined} tabIndex={-1} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>{input.current?.focus();setActive(exactAge(age)!==''?+age:0);setOpen(!expanded);}}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      </div>
      {expanded && <div className="age-choice-list" id={id+'-ages'} role="listbox" tabIndex={-1} aria-label="Age in years">{EXACT_AGES.map((n,index)=><div key={n} ref={el=>{options.current[index]=el;}} id={id+'-option-'+index} role="option" tabIndex={-1} aria-selected={n===value} className={index===active?'is-active':''} onMouseDown={e=>e.preventDefault()} onClick={()=>pick(index)}>{n} {n==='1'?'year':'years'} old{n===value&&<span aria-hidden="true">✓</span>}</div>)}</div>}
    </div>
    <p id={id+'-help'} className="small muted">Type an age or choose from the list to find age-appropriate gifts.</p>
    {!valid&&<p id={id+'-error'} className="age-choice-error" role="alert">Enter a whole number from 0 to 120, or choose an age from the list.</p>}
  </div>;
}
