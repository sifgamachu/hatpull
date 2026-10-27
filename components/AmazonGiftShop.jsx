import { AMAZON_DISCLOSURE, AFF_REL, amazonUrl } from '@/lib/core';
import { positiveMoney } from '@/lib/gifts.mjs';
import GiftArtwork from './GiftArtwork';
import { giftPreferencesFromProfile, giftSearchQuery } from '@/lib/gift-preferences.mjs';

const departments = [
  ['Home & cozy','cozy home gifts','cozy','A little everyday comfort'],
  ['Coffee & tea','coffee tea gifts','coffee','For their favorite ritual'],
  ['Tech finds','tech gifts','tech','Useful little upgrades'],
  ['Games & fun','board games gifts','games','Make time for play'],
  ['Books & journals','books journals gifts','books','Turn a new page'],
  ['Self-care','self care gifts','wellness','A moment just for them'],
];
export default function AmazonGiftShop({budget,currency='$',profile}) {
  const cap=positiveMoney(budget),usd=!currency||currency==='$';
  const preferences=giftPreferencesFromProfile(profile);
  const url=query=>amazonUrl(giftSearchQuery(query,preferences),0,usd?cap:0);
  return <section className="amazon-shop" aria-label="Amazon gift browsing">
    <nav className="amazon-shop-categories" aria-label="Amazon gift departments">{departments.map(([label,query])=><a key={label} href={url(query)} target="_blank" rel={AFF_REL}>{label} ↗</a>)}</nav>
    <div className="amazon-shop-hero"><div><p className="eyebrow">Find it on Amazon</p><h3>A little inspiration.<br/>A gift they’ll love.</h3><p>Browse the full selection on Amazon, then use <b>Add to List</b> to keep your favorites together.</p><a className="btn amazon-browse-button" href={url('gift ideas')} target="_blank" rel={AFF_REL}>Browse your gift on Amazon ↗</a></div><div className="amazon-hero-art" aria-hidden="true"><GiftArtwork kind="gift"/></div></div>
    <div className="amazon-shop-budget"><b>{cap?`Celebration budget: ${currency||'$'}${cap}`:'Find something thoughtful at any budget.'}</b><span>{cap&&usd?'Your budget is included in the Amazon search. Check final prices, shipping and tax.':!usd?'Amazon.com uses US dollars. Compare currencies before buying.':'Explore a department below. Each opens Amazon in a new tab.'}</span></div>
    <div className="amazon-departments">{departments.map(([label,query,art,detail])=><a key={label} className={`amazon-department department-${art}`} href={url(query)} target="_blank" rel={AFF_REL}><h3>{label}</h3><span className="amazon-department-art"><GiftArtwork kind={art}/></span><p>{detail}</p><span className="amazon-department-link">Browse on Amazon ↗</span></a>)}</div>
    <p className="amazon-shop-disclosure">{AMAZON_DISCLOSURE} These are gift categories; product photos, prices and shopping are on Amazon.</p>
  </section>;
}
