// Only product references and participant-authored preferences are persisted.
export const EBAY_ITEM_ID = /^v1\|\d{9,15}\|\d{1,15}$/;
export function ebayItemId(value) {
  if (typeof value !== 'string') return '';
  if (EBAY_ITEM_ID.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['ebay.com', 'www.ebay.com'].includes(url.hostname) || url.port || url.username || url.password) return '';
    const id = url.pathname.match(/^\/itm\/(?:[^/]+\/)?(\d{9,15})\/?$/)?.[1];
    const variation = url.searchParams.get('var') || '0';
    return id && /^\d{1,15}$/.test(variation) ? `v1|${id}|${variation}` : '';
  } catch { return ''; }
}
export function ebayProductUrl(id) {
  if (!EBAY_ITEM_ID.test(id || '')) return '';
  const [, item, variation] = id.split('|');
  return `https://www.ebay.com/itm/${item}${variation !== '0' ? `?var=${variation}` : ''}`;
}
export function safeEbayImage(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.port && !u.username && !u.password && u.hostname === 'i.ebayimg.com' && u.pathname.startsWith('/images/') ? u.href : '';
  } catch { return ''; }
}
export function ebayWish(product, id) {
  const url = ebayProductUrl(product?.itemId);
  if (!url) throw new Error('Choose an eBay product first.');
  return { id, t: 'eBay gift', u: url, a: '', n: '', q: '', p: '', size: '', color: '', priority: '', art: 'gift' };
}
