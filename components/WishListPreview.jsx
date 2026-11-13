"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {rpc} from '@/lib/db';
import {getG} from '@/lib/store';
import {ebayItemId} from '@/lib/ebay-products.mjs';
import {ProductPicture,useGiftProducts} from './GiftProducts';
export default function WishListPreview({group,member}){
 const ref=useRef(null),[snapshot,setSnapshot]=useState(null),key=group.id+':'+member.id+':'+member.wishes;
 const items=snapshot?.key===key?snapshot.items:[];
 const visible=items.slice(0,3),ids=visible.map(w=>ebayItemId(w.u)||w.a||'').filter(Boolean),products=useGiftProducts(ids);
 useEffect(()=>{
  let alive=true,started=false;
  async function load(){if(started)return;started=true;try{const tokens=getG(group.id),{state}=await rpc('hp_state_delta',{p_gid:group.id,p_mtok:tokens?.mtok||null,p_atok:tokens?.atok||null,p_profile:member.id,p_version:null});const list=state?.members?.find(m=>m.id===member.id)?.profile?.items;if(alive)setSnapshot({key,items:Array.isArray(list)?list:[]});}catch{/* Keep the saved count when a preview cannot load. */}}
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();observer.disconnect();}},{rootMargin:'150px'});
  if(observer&&ref.current)observer.observe(ref.current);else load();
  return()=>{alive=false;observer?.disconnect();};
 },[group.id,member.id,member.wishes,key]);
 const href=`/g/${group.id}/w/${member.id}`;
 return <div ref={ref}>{visible.length?<Link className="reference-wish-previews" href={href} aria-label={`${member.wishes} saved ${member.wishes===1?'wish':'wishes'} — view gifts`}>{visible.map(w=><span key={w.id} title={w.t}><ProductPicture product={products[ebayItemId(w.u)||w.a]} art={w.art}/></span>)}{member.wishes>3&&<span className="reference-preview-more">+{member.wishes-3}</span>}</Link>:<p className="reference-wish-count">{member.wishes} saved {member.wishes===1?'wish':'wishes'}<Link href={href}>View gifts ›</Link></p>}</div>;
}
