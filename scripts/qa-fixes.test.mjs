import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './test-db.mjs';

const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const one=async(db,sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
const as=(db,uid) => db.query("select set_config('test.uid',$1,false)",[uid || '']);
const members=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'},{id:'d',name:'D'}];

async function setup(extra={}) {
  const db=await testDatabase();
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())',[owner,other]);
  await as(db,owner);
  const g=await one(db,'select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify({name:'QA fixes',mode:'draw',members,...extra}),owner]);
  await db.query(`update hp_members set token='tok-'||id where group_id=$1`,[g.id]);
  return {db,g};
}

test('QA fixes 2026-10-24', async t => {
  await t.test('a participant link works even with a stale or foreign organizer key', async()=>{
    const {db,g}=await setup();
    try {
      await as(db,other); // signed in as someone else, holding the owner's key
      await assert.rejects(one(db,'select hp_state($1,null,$2) result',[g.id,g.admin_token]),/not_group_owner/);
      const s=await one(db,'select hp_state($1,$2,$3) result',[g.id,'tok-b',g.admin_token]);
      assert.equal(s.is_admin,false); assert.equal(s.me.id,'b');
      const d=await one(db,'select hp_state_delta($1,$2,$3,$4,null) result',[g.id,'tok-b',g.admin_token,'b']);
      assert.equal(d.state.is_admin,false);
      await as(db,null); // signed out
      assert.equal((await one(db,'select hp_state($1,$2,$3) result',[g.id,'tok-b',g.admin_token])).me.id,'b');
    } finally { await db.close(); }
  });

  await t.test('organizer who joined under a regular name cannot see reservations on their own list', async()=>{
    const {db,g}=await setup(); // no org_mid: organizer is not "is_org"
    try {
      await db.query(`update hp_members set user_id=$2, profile='{"items":[{"id":"w1","t":"Gift"}]}' where group_id=$1 and id='a'`,[g.id,owner]);
      await db.query(`insert into hp_reservations(group_id,owner_id,item_id,by_member) values($1,'a','w1','b')`,[g.id]);
      await as(db,owner);
      const s=await one(db,'select hp_state($1,null,null) result',[g.id]);
      assert.equal(s.is_admin,true);
      assert.deepEqual(s.reservations.filter(r=>r.owner==='a'),[]);
      const d=await one(db,'select hp_state_delta($1,null,null,$2,null) result',[g.id,'a']);
      assert.deepEqual(d.state.reservations,[]);
    } finally { await db.close(); }
  });

  await t.test('groups without a date never unlock results', async()=>{
    const {db,g}=await setup();
    try {
      assert.equal(await one(db,'select results_after result from hp_groups where id=$1',[g.id]),null);
      await db.query(`update hp_groups set results_after = current_date - 10 where id=$1`,[g.id]);
      assert.equal(await one(db,'select results_after result from hp_groups where id=$1',[g.id]),null);
      await as(db,owner);
      assert.equal(await one(db,'select hp_results($1,null) result',[g.id]),null);
    } finally { await db.close(); }
  });

  await t.test('reservations must target a real wish and are capped', async()=>{
    const {db,g}=await setup({settings:{wishVis:'all'}});
    try {
      await db.query(`update hp_members set profile='{"items":[{"id":"w1","t":"Gift"}]}' where group_id=$1 and id='a'`,[g.id]);
      await as(db,null);
      await assert.rejects(db.query('select hp_reserve($1,$2,$3,$4,true)',[g.id,'tok-b','a','made-up']),/forbidden/);
      await db.query('select hp_reserve($1,$2,$3,$4,true)',[g.id,'tok-b','a','w1']);
      assert.equal(await one(db,'select count(*)::int result from hp_reservations where group_id=$1',[g.id]),1);
    } finally { await db.close(); }
  });

  await t.test('one member cannot exhaust group-wide limits', async()=>{
    const {db,g}=await setup();
    try {
      await as(db,null);
      for (let i=0;i<15;i++) await db.query('select hp_ask($1,$2,$3,$4)',[g.id,'tok-b','c','q'+i]);
      await assert.rejects(db.query('select hp_ask($1,$2,$3,$4)',[g.id,'tok-b','c','one more']),/slow down/);
      await db.query('select hp_ask($1,$2,$3,$4)',[g.id,'tok-d','c','still works']);
      for (let i=0;i<10;i++) await db.query('select hp_add_kid($1,$2,$3)',[g.id,'tok-b','Kid '+i]);
      await assert.rejects(db.query('select hp_add_kid($1,$2,$3)',[g.id,'tok-b','Kid 11']),/too many/);
      await db.query('select hp_add_kid($1,$2,$3)',[g.id,'tok-d','Kid of D']);
      const s=await one(db,'select hp_state($1,$2,null) result',[g.id,'tok-c']);
      assert.ok(s.questions.every(q=>!('asked_by' in q)));
    } finally { await db.close(); }
  });

  await t.test('wish links must be web links', async()=>{
    const {db,g}=await setup();
    try {
      await as(db,null);
      await assert.rejects(db.query('select hp_save_profile($1,$2,$3,$4::jsonb)',[g.id,'tok-b','b',JSON.stringify({items:[{id:'x',t:'Bad',u:'javascript:alert(1)'}]})]));
      await db.query('select hp_save_profile($1,$2,$3,$4::jsonb)',[g.id,'tok-b','b',JSON.stringify({items:[{id:'x',t:'Good',u:'https://example.com/p'}]})]);
    } finally { await db.close(); }
  });

  await t.test('bad organizer settings are cleaned instead of breaking the group page', async()=>{
    const {db,g}=await setup();
    try {
      await as(db,owner);
      await db.query('select hp_admin_update($1,null,$2::jsonb)',[g.id,JSON.stringify({settings:{mail:{on:'maybe'},wishVis:'nope'}})]);
      const s=await one(db,'select hp_state($1,$2,null) result',[g.id,'tok-b']);
      assert.equal(s.group.settings.mail.on,false); assert.equal(s.group.settings.wishVis,'all');
      await db.query('select hp_admin_update($1,null,$2::jsonb)',[g.id,JSON.stringify({settings:null})]);
      assert.ok(await one(db,'select hp_state($1,$2,null) result',[g.id,'tok-b']));
    } finally { await db.close(); }
  });
});
