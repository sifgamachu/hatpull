"use client";
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {sb} from '@/lib/db';
import {useUser,syncAccount} from '@/lib/auth';
import {setG} from '@/lib/store';
import SignIn from './SignIn';
import AccountScene from './AccountScene';
import {AccountGifts} from './AccountCard';
export default function CreateWishList(){
 const user=useUser(),router=useRouter(),creating=useRef(false);
 const [name,setName]=useState(`My wish list ${new Date().getFullYear()}`),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[signIn,setSignIn]=useState(false);
 useEffect(()=>{try{const value=sessionStorage.getItem('hatpull.personal-list-name');if(value)setName(value);}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{sessionStorage.setItem('hatpull.personal-list-name',name);}catch{}},[ready,name]);
 async function create(e){e.preventDefault();if(creating.current)return;if(!name.trim())return setError('Give your wish list a name.');creating.current=true;setBusy(true);setError('');try{
 const {data:{session}}=await sb().auth.getSession();if(!session||session.user.is_anonymous){setSignIn(true);return;}
 const orgName=(session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Me').slice(0,40);
 const response=await fetch('/api/create',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`},body:JSON.stringify({name:name.trim(),orgName,mode:'wish',personal:true,includeMe:true,people:[orgName],exclusions:[],date:'',budget:'',cur:'$',note:''})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Couldn’t create your wish list. Try again.');
 setG(result.id,{atok:result.admin_token,code:result.join_code,mtok:result.org_token,mid:result.org_mid,name:name.trim(),date:'',role:'organizer'});await syncAccount();try{sessionStorage.removeItem('hatpull.personal-list-name');}catch{}router.push(`/g/${result.id}/w/${result.org_mid}`);
 }catch(e){setError(e instanceof TypeError?'Check your connection and try again.':e.message);}finally{creating.current=false;setBusy(false);}}
 return <div className="reference-create-wish"><AccountScene wishes/><div className="reference-hub-column"><h1 className="sr-only">Create a wish list</h1><AccountGifts/><form className="reference-question-card stack" onSubmit={create}><h2>What is this wish list called?</h2><label className="sr-only" htmlFor="personal-list-name">Wish list name</label><input id="personal-list-name" value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Enter a name…" autoFocus/><p className="small muted">Name your list, then add gifts you’d love.</p>{error&&<p className="note err" role="alert">{error}</p>}<button className="reference-action" type="submit" disabled={!ready||busy||user===undefined}>{busy?'Creating…':'Continue'}<span aria-hidden="true">›</span></button></form></div>{signIn&&<SignIn close={()=>setSignIn(false)} next="/wish-lists/create" why="Sign in to keep your wish list on every device."/>}</div>;
}
