// Presentation derives from server-authorized state; it never invents access.
export function celebrationNextStep(state){
  const {group:g,me,members,is_admin:admin}=state;
  const people=members.filter(m=>!m.kid),mine=members.find(m=>m.id===me?.id),waiting=people.filter(m=>!m.claimed).length;
  if(admin&&waiting)return {label:'Invite your people',detail:`${waiting} ${waiting===1?'person hasn’t':'people haven’t'} joined yet. Share the group invitation to get everyone started.`,href:`/invite/${g.id}`,action:'Share invitation'};
  if(me&&!mine?.wishes)return {label:'Make your wish list',detail:'Choose your age and gender preferences, then save a few gifts you’d love.',href:`/g/${g.id}/w/${me.id}`,action:'Find my first gifts'};
  if(g.mode==='draw'&&me?.receiver_id&&!me.drawn)return {label:'Your surprise is waiting',detail:'Reveal your drawn name when you’re ready. Only you see your match.',href:'#my-drawn-name',action:'Go to my draw'};
  if(g.mode==='draw'&&me?.drawn&&me.receiver_id){const recipient=members.find(m=>m.id===me.receiver_id);if(recipient?.visible)return {label:'Find their perfect gift',detail:'Open your recipient’s wishes and reserve an individual gift privately.',href:`/g/${g.id}/w/${recipient.id}`,action:'Open their wish list'};}
  return {label:'A little inspiration for everyone',detail:'Explore the wish lists shared with your celebration.',href:'#celebration-people',action:'See everyone’s wishes'};
}
