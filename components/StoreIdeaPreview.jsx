import GiftArtwork from './GiftArtwork';
import { storePreviewIdeas } from '@/lib/store-preview-ideas.mjs';

export default function StoreIdeaPreview({profile,store='Amazon',loading=false}) {
  return <span className="store-preview store-preview-ideas">
    <span className="store-preview-items">{storePreviewIdeas(profile).map(idea=><span className="store-preview-item" key={idea.id}>
      <span className="store-preview-photo"><GiftArtwork kind={idea.art}/></span>
      <span className="store-preview-title">{idea.title}</span>
    </span>)}</span>
    <span className="store-preview-caption">{loading?'Finding matching products…':`Gift ideas · see products and prices on ${store}`}</span>
  </span>;
}
