import Link from 'next/link';
import {JourneyArtwork} from './JourneyUI';
export default function StartHero(){
  return <section className="start-hero reference-hero" aria-label="Secret Santa generator"><div className="reference-hero-copy"><h1>Draw names for your Secret Santa!</h1><ul className="reference-benefits"><li><Link href="/new?occ=0">Draw names</Link> and share a surprise</li><li><Link href="/new?mode=wish">Share wish lists</Link> for your celebration</li><li><Link href="/gift-finder">Find gifts</Link> they’ll love to unwrap</li></ul><p className="reference-trust">Free for 3–200 people.<br/>Private matches, one invitation, your budget.</p><Link className="btn reference-start" href="/new?occ=0">Start Drawing Names <span aria-hidden="true">›</span></Link><a className="link reference-sample" href="#try-a-draw">Try a sample draw</a></div><JourneyArtwork/></section>;
}
