import GiftFinder from '@/components/GiftFinder';

// Keep the selected celebration, preferences and gift list mounted between steps.
export default function Layout({children}) {
  return <div className="page"><GiftFinder/>{children}</div>;
}
