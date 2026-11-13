"use client";
import {useState} from 'react';
import {useCelebrations} from '@/lib/useCelebrations';
import SignIn from './SignIn';
import Festive from './Festive';
import AccountHub from './AccountHub';
export default function My({view='celebrations'}){
 const data=useCelebrations(),[signIn,setSignIn]=useState(false);
 return <><Festive/><AccountHub view={view} {...data} onRetry={data.retry} onSignIn={()=>setSignIn(true)}/>{signIn&&<SignIn close={()=>setSignIn(false)} next={view==='wishes'?'/wish-lists':view==='friends'?'/friends':'/my'}/>}</>;
}
