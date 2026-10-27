import Link from 'next/link';

export function JourneyHeading({eyebrow,title,children,action}){
  return <header className="journey-heading"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{children&&<div className="journey-heading-copy">{children}</div>}</div>{action}</header>;
}
export function HubNav({active='celebrations'}){
  return <nav className="journey-nav" aria-label="Your Hatpull"><Link href="/my" aria-current={active==='celebrations'?'page':undefined}>My celebrations</Link><Link href="/wish-lists" aria-current={active==='wishes'?'page':undefined}>My wish lists</Link><Link href="/friends" aria-current={active==='friends'?'page':undefined}>People I’m gifting</Link><Link href="/gift-finder">Find gifts ↗</Link></nav>;
}
export function CelebrationNav({gid,mid,active='overview',admin=false}){
  return <nav className="journey-nav" aria-label="Celebration"><Link href={`/g/${gid}`} aria-current={active==='overview'?'page':undefined}>Overview</Link>{mid&&<Link href={`/g/${gid}/w/${mid}`} aria-current={active==='wishes'?'page':undefined}>My wish list</Link>}<Link href={`/g/${gid}#celebration-people`}>Everyone’s wishes</Link><Link href={`/g/${gid}#celebration-messages`}>Messages</Link>{admin&&<Link href={`/invite/${gid}`} aria-current={active==='invite'?'page':undefined}>Invite people</Link>}</nav>;
}
export function JourneyArtwork(){
  return <div className="journey-art" aria-hidden="true"><div className="journey-orbit orbit-one"/><div className="journey-orbit orbit-two"/><span className="journey-spark spark-one">✦</span><span className="journey-spark spark-two">✧</span><div className="journey-present present-tall"><i/><b/></div><div className="journey-present present-wide"><i/><b/></div><div className="journey-art-note"><span>♡</span><div><strong>A little wish.<br/>A lovely surprise.</strong><small>Made personal with Hatpull</small></div></div></div>;
}
