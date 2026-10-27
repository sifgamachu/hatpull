"use client";
import {useEffect,useState} from 'react';
import {allG,delG} from './store';
import {rpc} from './db';
import {useUser} from './auth';
import {normState,daysUntil} from './core';
// Shared hub loader: bounded requests, no cross-account stale rows, no catalog caching.
export function useCelebrations(){
  const user=useUser(),identity=user===undefined?undefined:user?.id||'guest';
  const [snapshot,setSnapshot]=useState(null),[revision,setRevision]=useState(0);
  useEffect(()=>{
    if(identity===undefined)return;
    let active=true,generation=0,timer;
    async function load(){
      const current=++generation,groups=allG(),results=[];let index=0;
      await Promise.all(Array.from({length:Math.min(4,groups.length)},async()=>{
        while(index<groups.length){const x=groups[index++];try{results.push({x,s:normState(await rpc('hp_state',{p_gid:x.gid,p_mtok:x.mtok||null,p_atok:x.atok||null}))});}catch(e){results.push({x,gone:/not_found/.test(e.message),locked:/organizer_|not_group_owner|forbidden/.test(e.message)});}}
      }));
      if(!active||current!==generation)return;
      results.filter(r=>r.gone).forEach(r=>delG(r.x.gid));
      const rows=results.filter(r=>r.s).sort((a,b)=>((daysUntil(a.s.group.date)??0)<0)-((daysUntil(b.s.group.date)??0)<0)||String(a.s.group.date||'').localeCompare(String(b.s.group.date||'')));
      setSnapshot({identity,rows,locked:results.filter(r=>r.locked),failures:results.filter(r=>!r.s&&!r.gone&&!r.locked).length});
    }
    const changed=()=>{clearTimeout(timer);timer=setTimeout(load,100);},wake=()=>{if(!document.hidden)changed();};
    load();window.addEventListener('hatpull:groups',changed);window.addEventListener('storage',changed);window.addEventListener('focus',wake);
    return()=>{active=false;generation++;clearTimeout(timer);window.removeEventListener('hatpull:groups',changed);window.removeEventListener('storage',changed);window.removeEventListener('focus',wake);};
  },[identity,revision]);
  return {...(snapshot&&snapshot.identity===identity?snapshot:{rows:null,locked:[],failures:0}),user,retry:()=>setRevision(x=>x+1)};
}
