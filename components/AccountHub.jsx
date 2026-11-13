"use client";
import {useState} from 'react';
import Link from 'next/link';
import {fmtDate,daysUntil} from '@/lib/core';
import AccountScene, {FriendGiftArtwork} from './AccountScene';
import {AccountGifts} from './AccountCard';
import WishListPreview from './WishListPreview';

const old = g => !!g.date && daysUntil(g.date)<0;
const listPath = (g,m) => `/g/${g.id}/w/${m.id}`;
export default function AccountHub({view='celebrations',rows,locked=[],failures=0,user,onSignIn,onRetry}){
 const [query,setQuery]=useState('');
 const all=rows||[], personal=g=>g.settings?.personal===true;
 const groups=all.filter(({s})=>!personal(s.group));
 const lists=all.flatMap(({s})=>s.members.filter(m=>s.me&&(m.id===s.me.id||(m.kid&&m.parent_id===s.me.id))).map(m=>({g:s.group,m})));
 const friends=groups.filter(({s})=>!old(s.group)).flatMap(({s})=>s.members.filter(m=>m.id!==s.me?.id&&m.claimed).map(m=>({g:s.group,m,pick:!!s.me?.drawn&&s.me.receiver_id===m.id})));
 const data=view==='celebrations'?groups:view==='wishes'?lists:friends;
 const matches=data.filter(x=>[x.s?.group.name,x.g?.name,x.m?.name].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const title=view==='celebrations'?'My celebrations':view==='wishes'?'My wish lists':'My friends';
 const create=<Link className="reference-action" href={view==='wishes'?'/wish-lists/create':'/new'}>{view==='wishes'?'Make a new wish list':'Create a new celebration'}<span aria-hidden="true">{view==='wishes'?'+':'›'}</span></Link>;
 const wishCard=({g,m,pick})=><article className="reference-list-card" key={g.id+':'+m.id}><div className="reference-card-heading">{view==='friends'&&!m.visible?<strong>{m.name}</strong>:<Link href={listPath(g,m)}>{view==='friends'?m.name:m.kid?m.name+'’s wish list':personal(g)?g.name:'My wish list'}</Link>}{view==='friends'&&!m.visible?<span className="reference-card-tool" aria-label="Private wish list">⌑</span>:<Link className="reference-card-tool" href={listPath(g,m)} aria-label={`Open ${m.name}’s wish list`}>{view==='friends'?'›':'⚙'}</Link>}</div>{m.wishes>0&&(view!=='friends'||m.visible)&&<WishListPreview group={g} member={m}/>}{view==='friends'&&!m.visible&&<p className="small muted">This wish list is private to their gift-giver.</p>}{!personal(g)&&<p>{view==='friends'&&pick?'Your drawn name · ':''}Active in <Link href={`/g/${g.id}`}>{g.name}</Link></p>}</article>;
 const celebrationCard=({s})=>{const g=s.group;const names=s.members.filter(m=>!m.kid).map(m=>m.name);return <article className={`reference-list-card${old(g)?' reference-past-card':''}`} key={g.id}><div className="reference-card-heading"><Link href={`/g/${g.id}`}>{g.name}</Link><details className="reference-card-menu"><summary aria-label={`Options for ${g.name}`}>⋮</summary><div><Link href={`/g/${g.id}`}>Open celebration</Link>{s.me&&<Link href={listPath(g,s.me)}>My wish list</Link>}{s.is_admin&&<Link href={`/invite/${g.id}`}>Invite people</Link>}</div></details></div>{g.date&&<p><strong>{fmtDate(g.date)}</strong></p>}<p>{names.slice(0,5).join(', ')}{names.length>5?` and ${names.length-5} others…`:''}</p>{old(g)&&<Link className="reference-view-draw" href={`/g/${g.id}`}>View celebration ›</Link>}</article>;};
 const empty=view==='friends'&&rows!==null&&!friends.length;
 return <div className={`reference-hub reference-hub-${view}${empty?' reference-friends-empty':''}`}>
 {empty?<section className="reference-empty-friends"><FriendGiftArtwork/><h1>Discover perfect gifts for friends</h1><p>Friends from your celebrations will appear here so you can view their shared wish lists.</p>{!user&&user!==undefined&&<button className="link" onClick={onSignIn}>Sign in to find your friends</button>}{create}<Link className="reference-action reference-action-outline" href="/wish-lists/create">Create a wish list<span aria-hidden="true">›</span></Link></section>:<>
 <AccountScene wishes={view!=='celebrations'}/><div className="reference-hub-column"><h1>{title}</h1>
 {!user&&user!==undefined&&<div className="reference-signin"><p>Sign in to find your saved {view==='celebrations'?'celebrations':'wish lists'} on any device.</p><button className="link" onClick={onSignIn}>Sign in</button></div>}
 {locked.map(({x})=><article className="reference-list-card" key={x.gid}><Link href={`/g/${x.gid}`}>{x.name||'Saved celebration'} ›</Link><p>Open to restore access or sign in.</p></article>)}
 {!!failures&&<p className="note" role="alert">Some celebrations couldn’t load. <button className="link" onClick={onRetry}>Try again</button></p>}
 {data.length>5&&<label className="reference-hub-search"><span className="sr-only">Search {title.toLowerCase()}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}/></label>}
 {rows===null?<p role="status">Loading your {view==='celebrations'?'celebrations':'wish lists'}…</p>:<>
 {view==='celebrations'?<><div className="reference-card-list">{matches.filter(({s})=>!old(s.group)).map(celebrationCard)}</div>{create}{matches.some(({s})=>old(s.group))&&<><div className="reference-section-divider"/><h2 className="sr-only">Earlier celebrations</h2><div className="reference-card-list">{matches.filter(({s})=>old(s.group)).map(celebrationCard)}</div></>}</>:<>{matches.some(({g})=>!old(g))&&<><h2>{view==='wishes'?'Recent wish lists':'Your friends'}</h2><div className="reference-card-list">{matches.filter(({g})=>!old(g)).map(wishCard)}</div></>}{matches.some(({g})=>old(g))&&<><h2>Earlier {view==='wishes'?'wish lists':'celebrations'}</h2><div className="reference-card-list">{matches.filter(({g})=>old(g)).map(wishCard)}</div></>}{create}</>}
 {!matches.length&&<div className="reference-hub-empty"><AccountGifts/><h2>{query?'No matches yet':view==='wishes'?'Your wishes start here':'Bring your people together'}</h2><p>{query?'Try another name.':view==='wishes'?'Make a wish list, add gifts and share it with your people.':'Create a celebration to draw names or share wish lists.'}</p></div>}
 </>}
 </div></>}
 </div>;
}
