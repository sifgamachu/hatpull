import { createHash } from 'node:crypto';
import { CURRENCIES, rid } from './core.js';
import { exclusionsAllowed } from './setup-flow.mjs';
import { readJsonObject, RequestProblem, stringArray, exclusionArray } from './request-body.mjs';

const clean = s => String(s ?? '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim();
const reply = (error, status) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
const validId = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
function failure(error, action) {
  if (error instanceof RequestProblem) return reply(error.message, error.status);
  if (/invalid_session|not_signed_in/.test(error.message)) return Response.json({ error: 'Sign in with Google or email to manage your celebration.', code: 'organizer_sign_in_required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (/forbidden/.test(error.message)) return reply('Not allowed.', 403);
  if (/no_valid_draw/.test(error.message)) return reply('These exclusions leave no valid draw.', 400);
  if (/slow_down/.test(error.message)) return reply('You’ve created a lot of celebrations recently. Try again in a little while.', 429);
  if (/busy/.test(error.message)) return reply('We’re very busy right now. Try again in a minute.', 503);
  return reply(`Couldn’t ${action}. Try again.`, 500);
}

// Explicit dependencies let tests exercise real handlers without real accounts.
export function createCelebrationHandler({ verify, rpc, now = Date.now }) {
  const hits = new Map(), windowMs = 600000;
  return async request => {
    try {
      const userId = await verify(request.headers.get('authorization'));
      const b = await readJsonObject(request);
      for (const key of ['name','orgName','occasion','date','note','cur']) if (b[key] !== undefined && typeof b[key] !== 'string') throw new RequestProblem(`Check the ${key} field.`);
      if (b.mode !== undefined && !['draw','wish'].includes(b.mode)) throw new RequestProblem('Choose a draw or wish-list celebration.');
      if (b.includeMe !== undefined && typeof b.includeMe !== 'boolean') throw new RequestProblem('Check organizer participation.');
      if (b.budget !== undefined && !['string','number'].includes(typeof b.budget)) throw new RequestProblem('Check the budget.');
      const people = stringArray(b.people, 'people', 200).map(clean).filter(Boolean).map(x => x.slice(0,40));
      const mode = b.mode || 'draw', name = clean(b.name), orgName = clean(b.orgName).slice(0,40), budget = clean(b.budget), date = clean(b.date), cur = clean(b.cur) || '$';
      if (!name || !orgName) throw new RequestProblem('Enter the celebration and organizer names.');
      if (new Set(people.map(x=>x.toLowerCase())).size !== people.length) throw new RequestProblem('Two people have the same name.');
      if (people.length < (mode==='draw'?3:2)) throw new RequestProblem(mode==='draw'?'A draw needs at least 3 people.':'Add at least 2 people.');
      if (budget && (!/^\d+(\.\d{1,2})?$/.test(budget) || +budget<=0 || +budget>10000)) throw new RequestProblem('Enter a budget from 0.01 to 10,000, or choose No budget.');
      if (!CURRENCIES.includes(cur)) throw new RequestProblem('Choose a supported currency.');
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || +date.slice(0,4)<1 || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date)) throw new RequestProblem('Choose a valid celebration date.');
      if (b.includeMe && !people.includes(orgName)) throw new RequestProblem('Include the organizer in the people list.');
      const members = people.map(name=>({id:rid(6),name})), idOf = name=>members.find(m=>m.name===name)?.id;
      const requested = exclusionArray(b.exclusions);
      const exclusions = mode==='draw'?requested.map(x=>({a:idOf(clean(x.a).slice(0,40)),b:idOf(clean(x.b).slice(0,40))})).filter(x=>x.a&&x.b&&x.a!==x.b):[];
      if (!exclusionsAllowed(members,exclusions)) throw new RequestProblem('Exclusions require at least 4 people.');
      const time=now(), previous=hits.get(userId);
      if (previous && previous.reset>time && previous.count>=20) return reply('You’ve created a lot of celebrations in a short time. Wait a few minutes and try again.',429);
      if (hits.size>=5000) { for (const [key,bucket] of hits) if(bucket.reset<=time)hits.delete(key); if(hits.size>=5000)hits.delete(hits.keys().next().value); }
      hits.set(userId,{reset:previous?.reset>time?previous.reset:time+windowMs,count:previous?.reset>time?previous.count+1:1});
      const out=await rpc('hp_create_owned_group',{p_owner:userId,p:{client:createHash('sha256').update('hatpull:user:'+userId).digest('hex').slice(0,32),name:name.slice(0,80),org_name:orgName,occasion:clean(b.occasion).slice(0,40),date,budget,cur,note:clean(b.note).slice(0,500),mode,settings:{wishVis:'all',mail:{on:false,vis:'drawn'},venue:{type:'',address:''}},members,exclusions,org_mid:b.includeMe?idOf(orgName):null}});
      return Response.json(out,{headers:{'Cache-Control':'no-store'}});
    } catch(error) { return failure(error,'create the celebration'); }
  };
}

export function createRedrawHandler({verify,rpc}) {
  return async request => {
    try {
      const userId=await verify(request.headers.get('authorization')), b=await readJsonObject(request);
      if(!validId(b.gid))throw new RequestProblem('Choose a valid celebration.');
      const add=stringArray(b.add,'new people',200,true).map(clean).filter(Boolean).map(x=>x.slice(0,40));
      const remove=stringArray(b.remove,'removed people',200,true);
      if(remove.some(x=>!validId(x)))throw new RequestProblem('Check the removed people list.');
      const requested=b.exclusions===undefined?undefined:exclusionArray(b.exclusions);
      const roster=await rpc('hp_owned_roster',{p_gid:b.gid,p_owner:userId});
      if(!roster)return reply('Not allowed.',403);
      const members=roster.members.filter(m=>!remove.includes(m.id));
      for(const name of add){if(members.some(m=>m.name.toLowerCase()===name.toLowerCase()))throw new RequestProblem(`${name} is already in the group.`);members.push({id:rid(6),name});}
      if(members.length>200)throw new RequestProblem('A group can have up to 200 people.');
      if(members.length<(roster.mode==='draw'?3:2))throw new RequestProblem('Keep at least '+(roster.mode==='draw'?3:2)+' people in this celebration.');
      const ids=new Set(members.map(m=>m.id));
      const exclusions=(requested??roster.exclusions??[]).filter(x=>ids.has(x.a)&&ids.has(x.b)&&x.a!==x.b);
      if(roster.mode==='draw'&&!exclusionsAllowed(members,exclusions))throw new RequestProblem('Exclusions require at least 4 people. Remove exclusions before reducing the group to three.');
      await rpc('hp_redraw_owned_group',{p_gid:b.gid,p_owner:userId,p_members:members,p_exclusions:exclusions});
      return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    }catch(error){return failure(error,'save that change');}
  };
}
