import { normalizeWish, productAsin, productUrl, safeGiftUrl } from './gifts.mjs';

export const GIFT_CONTEXT_KEY = 'hatpull.gift-context';
export const GIFT_DRAFT_KEY = 'hatpull.shared-gift';
const clean = value => String(value || '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, ' ').trim();
const amazonHost = host => /(^|\.)amazon\.[a-z.]+$/.test(host) || ['a.co', 'amzn.to', 'amzn.eu'].includes(host);

// Parse only what the participant supplies. No retailer page scraping or clipboard polling.
export function giftFromInput(input, id = '') {
  const source = typeof input === 'string' ? { text: input } : input || {};
  const text = clean(source.text), explicit = clean(source.url);
  if (text.length > 8192 || explicit.length > 8192) throw new Error('This link is too long. Use the store’s Share or Copy link button.');
  const candidates = [...new Set((explicit ? [explicit] : text.match(/https?:\/\/[^\s<>"\u201c\u201d]+/gi) || []).map(x => x.replace(/[.,;!?\])]+$/, '')))];
  if (candidates.length > 1) throw new Error('Paste one product link at a time.');
  const raw = candidates[0] || text;
  const asin = productAsin(raw);
  const url = safeGiftUrl(asin ? productUrl(asin) : raw);
  if (!url || /\s/.test(raw) || !new URL(url).hostname.includes('.')) throw new Error('Copy a product link, then paste it here.');
  const parsed = new URL(url);
  if (amazonHost(parsed.hostname)) { parsed.searchParams.delete('tag'); parsed.searchParams.delete('ascsubtag'); }
  parsed.hash = '';
  if (parsed.href.length > 400) throw new Error('This link is too long. Use the store’s Share or Copy link button.');
  const suppliedTitle = clean(source.title) || (candidates.length && text !== raw ? clean(text.replace(candidates[0], '')) : '');
  let title = suppliedTitle.replace(/^Amazon(?:\.com)?\s*[:|–-]\s*/i, '').replace(/^[\s:–-]+|[\s:–-]+$/g, '');
  if (/^https?:\/\//i.test(title) || title === raw) title = '';
  // A descriptive slug is part of the participant's supplied URL, not fetched catalog content.
  if (!title && asin) {
    const parts = new URL(safeGiftUrl(raw) || url).pathname.split('/').filter(Boolean);
    const index = parts.findIndex(x => /^(dp|gp)$/i.test(x));
    if (index > 0) { try { title = decodeURIComponent(parts[index - 1]).replace(/[-_]+/g, ' '); } catch {} }
  }
  const isAmazon = amazonHost(parsed.hostname);
  return normalizeWish({ id, t: title || (isAmazon ? 'My Amazon gift' : `Gift from ${parsed.hostname.replace(/^www\./, '')}`), u: parsed.href, a: asin });
}

export const giftContextId = ({ gid, mid }) => `${gid}:${mid || ''}`;
export function chooseGiftContext(contexts, remembered, requested) {
  if (requested) return contexts.some(x => giftContextId(x) === requested) ? requested : '';
  if (remembered && contexts.some(x => giftContextId(x) === remembered)) return remembered;
  return contexts.length === 1 ? giftContextId(contexts[0]) : '';
}
export function readGiftDraft(storage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(GIFT_DRAFT_KEY) || 'null');
    if (!value || !Number.isFinite(value.at) || now < value.at || now - value.at >= 3600000) { storage.removeItem(GIFT_DRAFT_KEY); return null; }
    return giftFromInput(value.input);
  } catch { return null; }
}
