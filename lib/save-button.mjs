// "Save to Hatpull" browser button (a bookmarklet).
// It runs only when the participant clicks it on a product page they are already viewing, and sends
// just that page's link and product name to Hatpull's /share-gift page, exactly like the phone Share
// menu does. It never reads prices, photos, reviews, the cart or account details, and never runs
// on its own. Hatpull itself still makes no request to the retailer.

export const EXTERNAL_TRIP_KEY = 'hatpull.store-trip';

export function saveButtonCode(origin = 'https://hatpull.com') {
  const base = String(origin).replace(/\/+$/, '');
  // Keep this small and dependency-free: it runs inside the store's page.
  const body = `(function(){try{var d=document,c=d.querySelector('link[rel=canonical]'),u=(c&&/^https?:/.test(c.href)?c.href:location.href),e=d.getElementById('productTitle')||d.querySelector('h1'),t=((e&&e.innerText)||d.title||'').replace(/\\s+/g,' ').trim().slice(0,160);var w=window.open('${base}/share-gift?via=button&url='+encodeURIComponent(u)+'&title='+encodeURIComponent(t),'hatpull_save','width=520,height=760');if(!w)location.href='${base}/share-gift?via=button&url='+encodeURIComponent(u)+'&title='+encodeURIComponent(t)}catch(x){alert('Hatpull could not read this page. Copy the link and paste it in Hatpull instead.')}})()`;
  return 'javascript:' + body;
}

// Remember that the participant left for a store, so we can offer "paste what you found" on return.
export function noteStoreTrip(storage, store, now = Date.now()) {
  try { storage.setItem(EXTERNAL_TRIP_KEY, JSON.stringify({ store, at: now })); } catch {}
}
export function readStoreTrip(storage, now = Date.now(), maxAge = 3 * 3600000) {
  try {
    const value = JSON.parse(storage.getItem(EXTERNAL_TRIP_KEY) || 'null');
    if (!value || !Number.isFinite(value.at) || now < value.at || now - value.at > maxAge) return null;
    return value;
  } catch { return null; }
}
export function clearStoreTrip(storage) { try { storage.removeItem(EXTERNAL_TRIP_KEY); } catch {} }

export function storeFromHref(href) {
  try {
    const host = new URL(href).hostname.replace(/^(www|smile|m)\./, '');
    if (/(^|\.)amazon\.[a-z.]+$/.test(host) || ['a.co', 'amzn.to', 'amzn.eu'].includes(host)) return 'amazon';
    if (/(^|\.)ebay\.[a-z.]+$/.test(host)) return 'ebay';
    return '';
  } catch { return ''; }
}
