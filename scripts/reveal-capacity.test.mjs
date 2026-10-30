import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './test-db.mjs';
import { confirmedReveal } from '../lib/reveal-receipt.mjs';

const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const one=async(db,sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
test('compact reveals preserve privacy, invalidate polls, avoid the group-row write, and reject stale rounds',async()=>{
  const db=await testDatabase();
  try{
    await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[owner]);
    const people=Array.from({length:200},(_,i)=>({id:'p'+i,name:'Fictional '+i}));
    const g=await one(db,'select hp_create_owned_group($1,$2) result',[JSON.stringify({name:'Reveal fixture',members:people,mode:'draw',settings:{wishVis:'drawn'}}),owner]);
    await db.query("update hp_members set token='fixture-'||id,profile=jsonb_build_object('address','Private','items',jsonb_build_array(jsonb_build_object('id','w1','t','Fixture gift'))) where group_id=$1",[g.id]);
    const before=await one(db,'select hp_state_delta($1,$2,null,null,null) result',[g.id,'fixture-p0']);
    const groupVersion=await one(db,'select state_version result from hp_groups where id=$1',[g.id]);
    const receipt=await one(db,'select hp_reveal($1,$2,1) result',[g.id,'fixture-p0']);
    assert.equal(receipt.drawn,true);assert.equal(receipt.member_id,'p0');assert.notEqual(receipt.receiver.id,'p0');
    assert.ok(JSON.stringify(receipt).length<300);assert.ok(!JSON.stringify(receipt).includes('Private'));assert.ok(!JSON.stringify(receipt).includes('fixture-p0'));
    assert.equal(await one(db,'select state_version result from hp_groups where id=$1',[g.id]),groupVersion);
    const after=await one(db,'select hp_state_delta($1,$2,null,null,$3) result',[g.id,'fixture-p0',before.version]);
    assert.equal(after.state.me.drawn,true);assert.notEqual(after.version,before.version);
    await one(db,'select hp_reveal($1,$2,1) result',[g.id,'fixture-p0']);
    assert.deepEqual(await one(db,'select hp_state_delta($1,$2,null,null,$3) result',[g.id,'fixture-p0',after.version]),{version:after.version});
    await assert.rejects(one(db,'select hp_reveal($1,$2,1) result',[g.id,'invalid']),/forbidden/);
    await assert.rejects(one(db,'select hp_reveal($1,$2,0) result',[g.id,'fixture-p0']),/draw_changed/);
    // Old clients still use hp_mark_drawn and must invalidate new polling versions.
    await one(db,'select hp_mark_drawn($1,$2) result',[g.id,'fixture-p1']);
    assert.ok((await one(db,'select hp_state_delta($1,$2,null,null,$3) result',[g.id,'fixture-p0',after.version])).state);
    // Independent participant writes spread over multiple revision buckets.
    await db.query('update hp_members set drawn_round=1 where group_id=$1',[g.id]);
    assert.ok(await one(db,'select count(*)>8 result from hp_reveal_revisions where group_id=$1',[g.id]));
    for(const role of ['anon','authenticated']){
      assert.equal(await one(db,"select has_table_privilege($1,'hp_reveal_revisions','SELECT') result",[role]),false);
      assert.equal(await one(db,"select has_function_privilege($1,'hp_reveal(text,text,integer)','EXECUTE') result",[role]),true);
    }
    await one(db,'select hp_redraw_owned_group($1,$2,$3,$4) result',[g.id,owner,JSON.stringify(people),'[]']);
    await assert.rejects(one(db,'select hp_reveal($1,$2,1) result',[g.id,'fixture-p0']),/draw_changed/);
    assert.equal((await one(db,'select hp_reveal($1,$2,2) result',[g.id,'fixture-p0'])).round,2);
  }finally{await db.close();}
});

test('the UI accepts only a receipt for the current group, participant, token, round and recipient',()=>{
  const state={group:{id:'g',round:1},me:{id:'me',receiver_id:'them',drawn:false}};
  const receipt={group_id:'g',round:1,member_id:'me',receiver:{id:'them'},drawn:true,token:'private-fixture'};
  assert.equal(confirmedReveal(receipt,state,'private-fixture'),true);
  for(const patch of [{group_id:'other'},{round:2},{member_id:'someone'},{token:'reset'},{receiver:{id:'wrong'}},{drawn:false}])assert.equal(confirmedReveal({...receipt,...patch},state,'private-fixture'),false);
  assert.equal(confirmedReveal(receipt,null,'private-fixture'),false);
});
