"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { rpc } from '@/lib/db';
import { cleanWishDemographics } from '@/lib/gift-preferences.mjs';
import { createProfileSaveQueue } from '@/lib/profile-save-queue.mjs';
import AgeChoice from './AgeChoice';

export default function WishProfileChoices({ gid, mid, token, person, value, onChange, onBusy, onSaved, onAgeValidityChange, disabled = false, request = rpc }) {
  const id = useId(), [status, setStatus] = useState('idle'), queue = useRef(null);
  const callbacks = useRef({onBusy,onSaved}); callbacks.current = {onBusy,onSaved};
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
  return <section className="wish-profile-choices" aria-labelledby={id+'-title'}>
    <div className="wish-profile-heading"><div><p className="eyebrow">Your wish list, your kind of gifts</p><h2 id={id+'-title'}>{person ? `Find gifts for ${person}` : 'Find gifts you’ll love'}</h2><p>Choose gender and age, then pick a store below. Your choices save automatically.</p></div><span className="wish-profile-status" role="status">{status==='saving'?'Saving choices…':status==='saved'?'✓ Choices saved':status==='error'?'Choices not saved':'Optional · change anytime'}</span></div>
    <fieldset disabled={disabled}><legend>Gender</legend><div className="preference-options">{[['','No preference'],['women','Female'],['men','Male']].map(([key,label])=><label className="preference-option" key={key}><input type="radio" name={id+'-gender'} checked={(value.who||'')===key} onChange={()=>change('who',key)}/><span>{label}</span></label>)}</div></fieldset>
    <AgeChoice value={value.age||''} onChange={age=>change('age',age)} disabled={disabled} onValidityChange={onAgeValidityChange}/>
    {status==='error'&&<p role="alert" className="note err">We couldn’t save your choices. The ideas below use your latest selection. <button className="link" disabled={disabled} onClick={()=>queue.current?.retry()}>Retry saving</button></p>}
  </section>;
}
