import { normalizeWish, safeGiftUrl } from './gifts.mjs';

const MARKETS = new Set(['amazon.com','amazon.co.uk','amazon.ca','amazon.de','amazon.fr','amazon.it','amazon.es','amazon.com.au','amazon.co.jp','amazon.in','amazon.com.mx','amazon.com.br','amazon.nl','amazon.se','amazon.pl','amazon.com.be','amazon.ie','amazon.ae','amazon.sa','amazon.sg','amazon.com.tr','amazon.co.za']);

// A shared list is a link to Amazon, never an imported catalog or a connected Amazon account.
export function amazonWishListUrl(value) {
  const safe = safeGiftUrl(value);
  if (!safe) return '';
  const url = new URL(safe), host = url.hostname.replace(/^(www|smile)\./, '');
  if (!MARKETS.has(host) || url.port) return '';
  const match = url.pathname.match(/^\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist)\/([A-Z0-9]{6,40})(?:\/ref=[^/]*)?\/?$/i);
  return match ? `https://www.${host}/hz/wishlist/ls/${match[1]}` : '';
}

export function amazonWishListFromInput(value, id = '') {
  const text = String(value || '').trim();
  if (text.length > 8192) throw new Error('Use the view-only sharing link from your Amazon wish list.');
  const links = [...new Set((text.match(/https?:\/\/[^\s<>"\u201c\u201d]+/gi) || [text]).map(x => x.replace(/[.,;!?\])]+$/, '')))];
  if (links.length !== 1) throw new Error('Paste one Amazon wish-list sharing link at a time.');
  const url = amazonWishListUrl(links[0]);
  if (!url) throw new Error('Open your Amazon wish list, choose Invite → View only → Copy link, then paste that list link here. Product, cart and editing-invitation links won’t work here.');
  return normalizeWish({ id, t: 'Amazon wish list', u: url });
}
