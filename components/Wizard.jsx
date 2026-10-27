"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {OCCASIONS,CURRENCIES,BUDGETS,suggestDates,iso,fmtDate,money,canDraw} from '@/lib/core';
import {setG} from '@/lib/store';
import {toast} from '@/lib/ui';
import {syncAccount,useUser} from '@/lib/auth';
import {DRAFT_KEY,readWizardDraft} from '@/lib/wizard-draft.mjs';
import {setupSteps,nextSetupStep,setupPeople,validateSetup} from '@/lib/setup-flow.mjs';
import {sb} from '@/lib/db';
import Festive from './Festive';
import SignIn from './SignIn';
import {JourneyArtwork} from './JourneyUI';

export default function Wizard(){
  const router=useRouter(),q=useSearchParams(),user=useUser();
  const [signIn,setSignIn]=useState(false),[draftReady,setDraftReady]=useState(false),[reviewReturn,setReviewReturn]=useState(false);
  const [st,setSt]=useState(()=>{
    const s={step:0,mode:'draw',orgName:'',includeMe:true,names:['',''],excl:{},wantExcl:false,occ:'',name:'',date:'',budget:'',cur:'$',note:''};
    if(q.get('mode')==='wish'){s.mode='wish';s.step=1;}
    const oi=q.get('occ');
    if(oi==='other'){s.occ='Other';s.step=1;}
    else if(oi!==null&&OCCASIONS[+oi]){s.occ=OCCASIONS[+oi].k;const dates=suggestDates(s.occ);s.name=`${s.occ} ${(dates[0]||iso(new Date())).slice(0,4)}`;s.date=dates.find(d=>d.endsWith('-12-25'))||dates[0]||'';s.step=1;}
    return s;
  });
  const [err,setErr]=useState(''),[busy,setBusy]=useState(false),creating=useRef(false);
  const up=patch=>setSt(s=>({...s,...patch}));
  const people=useMemo(()=>setupPeople(st),[st.names,st.includeMe,st.orgName]);
  const allExcl=useMemo(()=>st.wantExcl?Object.entries(st.excl).flatMap(([a,bs])=>bs.map(b=>({a,b}))).filter(x=>people.includes(x.a)&&people.includes(x.b)):[],[st.excl,st.wantExcl,people]);
  const feasible=useMemo(()=>st.mode!=='draw'||people.length<3||canDraw(people,allExcl),[st.mode,people,allExcl]);
  useEffect(()=>{let saved;try{saved=readWizardDraft(sessionStorage,location.search)||readWizardDraft(localStorage,location.search);}catch{}if(saved)setSt(s=>({...s,...saved}));setDraftReady(true);},[]);
  useEffect(()=>{if(!draftReady)return;const draft=JSON.stringify({version:2,at:Date.now(),q:location.search,st});try{sessionStorage.setItem(DRAFT_KEY,draft);localStorage.setItem(DRAFT_KEY,draft);}catch{}},[st,draftReady]);
  useEffect(()=>{setErr('');window.scrollTo(0,0);},[st.step]);
  const steps=setupSteps(st.mode),position=steps.findIndex(s=>s.id===st.step);
  function validateNames(){return validateSetup(st,2,iso(new Date()));}
  function advance(){const error=validateSetup(st,st.step,iso(new Date()));if(error)return setErr(error);if(st.step===3&&!feasible)return setErr('These exclusions leave no valid draw. Remove an exclusion or add more people.');if(reviewReturn){setReviewReturn(false);up({step:5});}else up({step:nextSetupStep(st)});}
  function back(){setReviewReturn(false);up({step:nextSetupStep(st,-1)});}
  function edit(step){setReviewReturn(true);up({step});}
  async function create() {
    if (creating.current) return;
    const namesError = validateNames() || validateSetup(st,4,iso(new Date()));
    if (namesError) return setErr(namesError);
    if (st.date && st.date < iso(new Date())) return setErr("That date has already passed. Go back and pick a date in the future.");
    if (!feasible) return setErr('These exclusions leave no valid draw. Edit exclusions before creating.');
    creating.current = true; setBusy(true); setErr("");
    try {
      const note = st.note || (st.mode === "draw" ? `✨ You've been invited to make a wish list and draw a name for ${st.name}!` : `✨ You've been invited to share your wish list for ${st.name}!`);
      const { data: { session } } = await sb().auth.getSession();
      if (!session || session.user.is_anonymous) { setSignIn(true); setBusy(false); creating.current = false; return; }
      const res = await fetch("/api/create", { method: "POST", headers: { "content-type": "application/json", ...(session ? { authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({
        name: st.name, occasion: st.occ, date: st.date, budget: st.budget, cur: st.cur, note, mode: st.mode,
        orgName: st.orgName.trim(), includeMe: st.includeMe, people, exclusions: st.mode === "draw" ? allExcl : [] }) });
      let out; try { out = await res.json(); } catch { throw new Error("The server had a problem. Please try again in a moment."); }
      if (res.status === 401) setSignIn(true);
      if (!res.ok) throw new Error(out.error || "Couldn't create the celebration.");
      try { sessionStorage.removeItem(DRAFT_KEY); localStorage.removeItem(DRAFT_KEY); } catch {}
      setG(out.id, { atok: out.admin_token, code: out.join_code, mtok: out.org_token || null, mid: out.org_mid || null, name: st.name, date: st.date, role: "organizer" });
      await syncAccount();
      toast(`${st.name} created`);
      router.push(`/invite/${out.id}`);
    } catch (e) { setErr(e instanceof TypeError ? "Can't reach the server. Check your connection and try again." : e.message); setBusy(false); creating.current = false; }
  }

  let content,title,description;
  if(st.step===1){title='First, what’s your name?';description='You’ll organize the celebration. Decide whether you’d like to receive a gift too.';content=<><label htmlFor="org">Your name<input id="org" autoComplete="given-name" maxLength={40} value={st.orgName} onChange={e=>up({orgName:e.target.value})} placeholder="Your first name" autoFocus/></label><label className="check setup-check"><input type="checkbox" checked={st.includeMe} onChange={e=>up({includeMe:e.target.checked})}/>Include me {st.mode==='draw'?'in the draw':'in the wish-list group'}</label><p className="small muted">Organizers sign in before the group is created. Participants can join with your invitation link.</p></>;}
  if(st.step===2){title='Who’s celebrating with you?';description=st.mode==='draw'?'Add at least three people in total. You can paste a whole list of names.':'Add the people who will share wishes with each other.';content=<>{st.includeMe&&<div className="setup-organizer"><span className="person-avatar">{st.orgName.slice(0,1).toUpperCase()}</span><strong>{st.orgName}</strong><span className="pill">You · organizer</span></div>}<div className="setup-names">{st.names.map((name,i)=><div className="setup-name" key={i}><label className="sr-only" htmlFor={'person-'+i}>Person {i+1}</label><span aria-hidden="true">{i+(st.includeMe?2:1)}</span><input id={'person-'+i} maxLength={40} value={name} placeholder="First name" onChange={e=>{const names=[...st.names];names[i]=e.target.value;up({names});}} onPaste={e=>{const text=e.clipboardData.getData('text');if(/[\n,;]/.test(text)){e.preventDefault();up({names:st.names.filter(Boolean).concat(text.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean)).slice(0,201)});}}}/><button type="button" className="setup-remove" aria-label={`Remove person ${i+1}`} onClick={()=>up({names:st.names.length>1?st.names.filter((_,j)=>j!==i):['']})}>×</button></div>)}</div><button type="button" className="link" onClick={()=>up({names:[...st.names,'']})}>+ Add another person</button><p className="setup-count">{people.length} {people.length===1?'person':'people'} in your {st.mode==='draw'?'draw':'group'}</p></>;}
  if(st.step===3){title='Any names to keep apart?';description='For couples, housemates, or people who exchanged gifts last time.';content=<><div className="setup-options">{[[false,'Everyone can draw anyone','Except themselves, of course.'],[true,'Choose exclusions','Decide who should not draw whom.']].map(([value,label,help])=><button className="setup-option" type="button" key={label} aria-pressed={st.wantExcl===value} onClick={()=>up({wantExcl:value})}><span className="setup-selection" aria-hidden="true">{st.wantExcl===value?'✓':''}</span><span><strong>{label}</strong><small>{help}</small></span></button>)}</div>{st.wantExcl&&<ExclusionGrid people={people} excl={st.excl} onChange={excl=>up({excl})}/>}<p className="note small">{feasible?'No one draws themselves. Every person receives one gift.':'These exclusions leave no valid draw. Remove one or add more people.'}</p></>;}
  if(st.step===4){title='Make it your celebration';description='Set the occasion, date and amount everyone is comfortable spending.';content=<><fieldset className="setup-fieldset"><legend>What’s the occasion?</legend><div className="choices">{[...OCCASIONS.map(o=>o.k),'Other'].map(occasion=><button key={occasion} className="choice" type="button" aria-pressed={st.occ===occasion} onClick={()=>{const dates=suggestDates(occasion);up({occ:occasion,name:occasion==='Other'?st.name:`${occasion} ${(dates[0]||iso(new Date())).slice(0,4)}`,date:dates.find(d=>d.endsWith('-12-25'))||dates[0]||st.date});}}>{occasion}</button>)}</div></fieldset><label htmlFor="gname">Celebration name<input id="gname" maxLength={60} value={st.name} onChange={e=>up({name:e.target.value})} placeholder="Our holiday gift exchange"/></label><div className="grid2"><label htmlFor="celebration-date">Date <span className="muted">(optional)</span><input id="celebration-date" type="date" min={iso(new Date())} value={st.date} onChange={e=>up({date:e.target.value})}/></label><label htmlFor="cur">Currency<select id="cur" value={st.cur} onChange={e=>up({cur:e.target.value})}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label></div><fieldset className="setup-fieldset"><legend>Budget per person</legend><div className="choices">{BUDGETS.map(b=><button key={b} type="button" className="choice" aria-pressed={st.budget===String(b)} onClick={()=>up({budget:String(b)})}>{st.cur}{b}</button>)}<button type="button" className="choice" aria-pressed={!st.budget} onClick={()=>up({budget:''})}>No budget</button></div></fieldset><label htmlFor="budget">Your amount<input id="budget" inputMode="decimal" value={st.budget} onChange={e=>up({budget:e.target.value.slice(0,8)})} placeholder="Optional"/></label></>;}
  if(st.step===5){title='Everything look right?';description='Review your group before creating it. You’ll share invitations in the next step.';content=<><div className="setup-review">{[
    ['Organizer',st.orgName+(st.includeMe?' · taking part':' · organizing only'),1],
    ['People',people.join(', '),2],
    ...(st.mode==='draw'?[['Exclusions',allExcl.length?allExcl.map(x=>`${x.a} → ${x.b}`).join(' · '):'No exclusions',3]]:[]),
    ['Celebration',st.name,4],['Date',st.date?fmtDate(st.date):'To be decided',4],['Budget',st.budget?money(st.cur,st.budget)+' per person':'No budget set',4],
  ].map(([label,value,step])=><div key={label}><div><small>{label}</small><p>{value}</p></div><button type="button" className="link" aria-label={`Edit ${label.toLowerCase()}`} onClick={()=>edit(step)}>Edit</button></div>)}</div><label htmlFor="invite-note">A message for everyone <span className="muted">(optional)</span><textarea id="invite-note" maxLength={400} value={st.note} onChange={e=>up({note:e.target.value})} placeholder="Let’s share some lovely surprises. Add a few wishes so your gift-giver has ideas!"/></label><p className="small muted">{user?'Saved to your organizer account. No invitations are sent automatically.':'Sign in with Google or email to create your celebration. Your setup stays saved while you sign in.'}</p></>;}
  return <div className="journey-surface setup-page"><Festive on={false}/><div className="setup-layout"><aside className="setup-sidebar"><Link href="/secret-santa-generator" className="link">← Hatpull</Link><p className="eyebrow">A little planning. A lovely surprise.</p><h1>{st.mode==='wish'?'Share everyone’s wishes.':'Let’s make a Secret Santa.'}</h1><p>People you love. Gifts they’ll love. We’ll take care of the names.</p>{st.step>0&&<ol className="setup-steps" aria-label="Setup progress">{steps.map((step,i)=><li key={step.id} aria-current={st.step===step.id?'step':undefined} data-complete={position>i}><span>{position>i?'✓':i+1}</span><div><strong>{step.label}</strong><small>{step.hint}</small></div></li>)}</ol>}<div className="setup-reassurance"><span>♡</span><p>Free to use. Private matches.<br/>One invitation for your whole group.</p></div></aside><div className="setup-main">
    {st.step===0?<section className="panel setup-card stack"><JourneyArtwork/><p className="eyebrow">Start something good</p><h2>What would you like to do?</h2><div className="setup-options">{[['draw','Draw names for Secret Santa','Each person gives one gift and gets one surprise.'],['wish','Share wish lists','Everyone shares wishes. No name draw.']].map(([mode,label,help])=><button className="setup-option" key={mode} onClick={()=>up({mode,step:1})}><span className="setup-option-symbol" aria-hidden="true">{mode==='draw'?'↔':'♡'}</span><span><strong>{label}</strong><small>{help}</small></span><span aria-hidden="true">→</span></button>)}</div><Link className="link" href="/my">Already part of a celebration? Open it here →</Link></section>:<form className="panel setup-card stack" onSubmit={e=>{e.preventDefault();st.step===5?create():advance();}}><div className="setup-mobile-progress">Step {position+1} of {steps.length} · {steps[position]?.label}<div className="progress"><span style={{width:`${((position+1)/steps.length)*100}%`}}/></div></div><header><h2>{title}</h2><p>{description}</p></header>{content}{err&&<div role="alert" className="note err">{err}</div>}<div className="setup-footer"><button className="btn ghost" type="button" disabled={busy} onClick={back}>Back</button><button className="btn" type="submit" disabled={busy||!draftReady||(st.step===5&&user===undefined)||(st.step===3&&!feasible)}>{busy?'Creating…':st.step===5?(user?'Create celebration':'Sign in & create'):reviewReturn?'Back to review':'Continue'}<span aria-hidden="true">→</span></button></div></form>}
  </div></div>{signIn&&<SignIn required close={()=>setSignIn(false)} next={location.pathname+location.search} why="Save this celebration to your account. Your names, budget and settings are kept while you sign in." onSignedIn={()=>{setSignIn(false);create();}}/>}</div>;
}

export function ExclusionGrid({ people, excl, onChange, idName }) {
  // people: array of keys; idName maps key->label (for id-based use)
  const [both, setBoth] = useState(true);
  const label = k => (idName ? idName(k) : k);
  const toggle = (a, b) => {
    const on = !(excl[a] || []).includes(b); const nx = { ...excl };
    const set = (x, y, v) => { nx[x] = (nx[x] || []).filter(n => n !== y); if (v) nx[x].push(y); };
    set(a, b, on); if (both) set(b, a, on); onChange(nx);
  };
  return (
    <div className="stack">
      <label className="check"><input type="checkbox" checked={both} onChange={e => setBoth(e.target.checked)} /> Apply both ways</label>
      {people.map(a => (
        <div key={a}><label>{label(a)} shouldn't draw</label>
          <div className="choices">{people.filter(b => b !== a).map(b => <button key={b} type="button" className="choice" aria-pressed={(excl[a] || []).includes(b)} onClick={() => toggle(a, b)}>{label(b)}</button>)}</div>
        </div>))}
    </div>
  );
}
