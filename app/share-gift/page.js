import GiftFinderWorkspace from '@/components/GiftFinderWorkspace';
export const metadata = { title: 'Save a shared gift', robots: { index: false, follow: false } };
export default function ShareGift() {
  return <div className="gift-finder gift-link-page stack"><p className="eyebrow">A little wish, ready to save</p><h1>Keep that gift idea.</h1><GiftFinderWorkspace incoming/></div>;
}
