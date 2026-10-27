// Setup state is independent from presentation and the existing creation API.
export const SETUP_STEPS = [
  {id:1,label:'You',hint:'Your name and participation'},
  {id:2,label:'People',hint:'Everyone in your group'},
  {id:3,label:'Exclusions',hint:'Keep certain matches apart'},
  {id:4,label:'Celebration',hint:'Occasion, date and budget'},
  {id:5,label:'Review',hint:'Check everything before creating'},
];
export const setupSteps = mode => SETUP_STEPS.filter(s=>mode!=='wish'||s.id!==3);
export function nextSetupStep(state,direction=1){
  const ids=[0,...setupSteps(state.mode).map(s=>s.id)],i=ids.indexOf(state.step);
  return ids[Math.max(0,Math.min(ids.length-1,i+direction))];
}
export function setupPeople(state){return (state.includeMe&&state.orgName.trim()?[state.orgName.trim()]:[]).concat(state.names.map(n=>n.trim()).filter(Boolean));}
export function validateSetup(state,step,today){
  if(step===1&&!state.orgName.trim())return 'Enter your name.';
  if(step===2){
    const people=setupPeople(state),minimum=state.mode==='wish'?2:3;
    if(!state.orgName.trim())return 'Enter your organizer name first.';
    if(people.length<minimum)return `Add at least ${minimum} people${state.includeMe?', including you':''}.`;
    if(people.length>200)return 'A celebration can have up to 200 people.';
    if(new Set(people.map(n=>n.toLowerCase())).size!==people.length)return 'Two people have the same name. Add a last initial so everyone can tell them apart.';
  }
  if(step===4){
    if(!state.name.trim())return 'Give the celebration a name.';
    if(state.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(state.date)||Number.isNaN(Date.parse(state.date))||new Date(state.date).toISOString().slice(0,10)!==state.date||state.date<today))return 'Choose a valid date today or in the future, or leave it open.';
    if(state.budget&&(!/^\d+(\.\d{1,2})?$/.test(state.budget)||Number(state.budget)<=0||Number(state.budget)>10000))return 'Enter a budget from 0.01 to 10,000, with up to two decimal places, or choose No budget.';
  }
  return '';
}
export function migrateSetupDraft(state,version){
  if(version===2)return state;
  const old=state.step;
  const step=old===0?0:old===1?(state.orgName.trim()?2:1):old<=3?3:old<=6?4:5;
  return {...state,step:state.mode==='wish'&&step===3?4:step};
}
