import Link from 'next/link';
import Snow from './Snow';
import Lights from './Lights';
import {JourneyArtwork} from './JourneyUI';
export default function StartHero(){
  return <section className="start-hero xmas holiday-hero" aria-label="Secret Santa generator"><Snow density={6000}/><Lights n={16}/><div className="holiday-hero-copy"><p className="eyebrow">A little Christmas magic</p><h1>Secret Santa.<br/><em>Real Christmas joy.</em></h1><p>Bring your people together for a Secret Santa. Share wishes, find a gift they’ll love, and keep the surprise.</p><div className="row"><Link className="btn" href="/new?occ=0">Start a Secret Santa <span aria-hidden="true">→</span></Link><Link className="btn ghost" href="/new?mode=wish">Share wish lists</Link></div><p className="start-trust">Free for 3–200 people · Private matches · Your budget</p><a className="link" href="#try-a-draw">Try a sample draw first ↓</a></div><JourneyArtwork/></section>;
}
