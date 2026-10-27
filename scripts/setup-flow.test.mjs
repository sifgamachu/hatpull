import test from 'node:test';
import assert from 'node:assert/strict';
import {setupSteps,nextSetupStep,setupPeople,validateSetup,migrateSetupDraft} from '../lib/setup-flow.mjs';
import {readWizardDraft} from '../lib/wizard-draft.mjs';
import {celebrationNextStep} from '../lib/celebration-journey.mjs';
const base={step:1,mode:'draw',orgName:'Sam',includeMe:true,names:['Alex','Taylor'],excl:{},wantExcl:false,occ:'Christmas',name:'Friends',date:'2026-12-25',budget:'25',cur:'$',note:''};
test('draw and wish-only routes advance and backtrack through the correct stages',()=>{
  for(const mode of ['draw','wish']){
    const ids=[0,...setupSteps(mode).map(s=>s.id)];
    for(let i=0;i<ids.length;i++){
      assert.equal(nextSetupStep({...base,mode,step:ids[i]}),ids[Math.min(i+1,ids.length-1)]);
      assert.equal(nextSetupStep({...base,mode,step:ids[i]},-1),ids[Math.max(i-1,0)]);
    }
  }
  assert.deepEqual(setupSteps('wish').map(s=>s.id),[1,2,4,5]);
});
test('roster validation handles organizer participation, duplicate names and capacity',()=>{
  assert.deepEqual(setupPeople(base),['Sam','Alex','Taylor']);
  assert.equal(validateSetup(base,2,'2026-10-26'),'');
  assert.match(validateSetup({...base,includeMe:false},2,'2026-10-26'),/at least 3/);
  assert.equal(validateSetup({...base,includeMe:false,mode:'wish'},2,'2026-10-26'),'');
  assert.match(validateSetup({...base,names:['sam','Taylor']},2,'2026-10-26'),/same name/);
  assert.match(validateSetup({...base,names:Array.from({length:200},(_,i)=>'Person '+i)},2,'2026-10-26'),/200/);
});
test('review rejects malformed money, invalid calendar days and past dates',()=>{
  for(const budget of ['0','-10','1.2.3','1.234','10001','NaN'])assert.match(validateSetup({...base,budget},4,'2026-10-26'),/budget/);
  for(const date of ['2026-10-25','2026-02-31','invalid'])assert.match(validateSetup({...base,date},4,'2026-10-26'),/date/);
  assert.equal(validateSetup({...base,date:'',budget:''},4,'2026-10-26'),'');
  assert.equal(validateSetup({...base,budget:'25.50'},4,'2026-10-26'),'');
});
test('legacy setup drafts migrate without losing roster, exclusions or sign-in recovery',()=>{
  const storage=(step,version)=>({getItem:()=>JSON.stringify({version,at:1000,q:'?occ=0',st:{...base,step,excl:{Sam:['Alex']}}})});
  for(const [before,after] of [[0,0],[1,2],[2,3],[3,3],[4,4],[5,4],[6,4],[7,5]]){
    const draft=readWizardDraft(storage(before),'?occ=0',2000);
    assert.equal(draft.step,after);assert.deepEqual(draft.excl,{Sam:['Alex']});assert.deepEqual(draft.names,base.names);
  }
  assert.equal(readWizardDraft(storage(2,2),'?occ=0',2000).step,2);
  assert.equal(readWizardDraft(storage(6,2),'?occ=0',2000),null);
  assert.equal(migrateSetupDraft({...base,mode:'wish',step:2},1).step,4);
});
test('next actions respect unrevealed matches and server-provided wish-list visibility',()=>{
  const state={group:{id:'demo',mode:'draw'},me:{id:'sam',receiver_id:'alex',drawn:false},members:[{id:'sam',claimed:true,wishes:2},{id:'alex',name:'Hidden recipient',claimed:true,visible:false}],is_admin:false};
  assert.equal(celebrationNextStep(state).href,'#my-drawn-name');
  assert.ok(!JSON.stringify(celebrationNextStep(state)).includes('Hidden recipient'));
  assert.equal(celebrationNextStep({...state,me:{...state.me,drawn:true}}).href,'#celebration-people');
  assert.equal(celebrationNextStep({...state,me:{...state.me,drawn:true},members:state.members.map(m=>({...m,visible:true}))}).href,'/g/demo/w/alex');
  assert.equal(celebrationNextStep({...state,members:state.members.map(m=>({...m,wishes:0}))}).href,'/g/demo/w/sam');
});
