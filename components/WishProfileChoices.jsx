"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { rpc } from '@/lib/db';
import { cleanWishDemographics } from '@/lib/gift-preferences.mjs';
import { createProfileSaveQueue } from '@/lib/profile-save-queue.mjs';
import AgeChoice from './AgeChoice';

export default function WishProfileChoices({ gid, mid, token, person, value, onChange, onBusy, onSaved, onAgeValidityChange, onContinue, celebration, disabled = false, request = rpc }) {
  const id = useId(), [status, setStatus] = useState('idle'), [ageValid,setAgeValid] = useState(true), [continuing,setContinuing] = useState(false), queue = useRef(null), alive = useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const validity=useCallback(valid=>{setAgeValid(valid);onAgeValidityChange?.(valid);},[onAgeValidityChange]);
  const callbacks = useRef({onBusy,onSaved,onContinue}); callbacks.current = {onBusy,onSaved,onContinue};
  useEffect(() => {
    const next = createProfileSaveQueue({
      save: patch => request('hp_set_wish_demographics', {p_gid:gid,p_mtok:token,p_target:mid,p_patch:patch}),
      onStatus: s => {setStatus(s);callbacks.current.onBusy?.(s==='saving');},
      onSaved: () => callbacks.current.onSaved?.(),
    });
    queue.current = next;
    return () => {next.dispose();callbacks.current.onBusy?.(false);};
  }, [gid,mid,token,request]);
  useEffect(() => {
    if(status!=='saving'&&status!=='error')return;
    const leave=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);
  },[status]);
  function change(field,next) {
    onChange({...cleanWishDemographics(value),[field]:next});
    queue.current?.change({[field]:next});
  }
  async function next() {
    if(disabled||!ageValid||continuing)return;
    setContinuing(true);
    try {
      const saved=await queue.current?.flush();
      if(saved&&alive.current)callbacks.current.onContinue?.();
    } finally {if(alive.current)setContinuing(false);}
  }
  return <section className="wish-profile-choices" aria-labelledby={id+'-title'}>
    <div className="wish-profile-heading"><span className="wish-profile-gift" aria-hidden="true">🎁</span><p className="eyebrow">Step 1 of 2 · About {person||'you'}</p><h2 id={id+'-title'} tabIndex={-1}>{person ? `Find gifts for ${person}` : 'Find gifts you’ll love'}</h2><p>{celebration&&<strong>{celebration}<br/></strong>}Tell us a little about {person||'yourself'}, then choose where to shop.</p></div>
    <AgeChoice label={person?`How old is ${person}?`:'What is your age?'} value={value.age||''} onChange={age=>change('age',age)} disabled={disabled||continuing} onValidityChange={validity}/>
    <fieldset disabled={disabled||continuing}><legend>{person?'Gift ideas for':'Who are you?'}</legend><div className="preference-options">{[['women','Female'],['men','Male'],['','No preference']].map(([key,label])=><label className="preference-option" key={key}><input type="radio" name={id+'-gender'} checked={(value.who||'')===key} onChange={()=>change('who',key)}/><span>{label}</span></label>)}</div></fieldset>
    {status==='error'&&<p role="alert" className="note err">We couldn’t save your choices. Please try again to continue. <button className="link" disabled={disabled||continuing} onClick={()=>queue.current?.retry()}>Retry saving</button></p>}
    <div className="wish-profile-footer"><button type="button" className="btn wish-profile-continue" disabled={disabled||!ageValid||continuing} onClick={next}>{continuing?'Saving choices…':'Continue'}<span aria-hidden="true">→</span></button><span className="wish-profile-status" role="status">{status==='saving'?'Saving choices…':status==='saved'?'✓ Choices saved':status==='error'?'Choices not saved':'Next: choose a store'}</span></div>
  </section>;
}
