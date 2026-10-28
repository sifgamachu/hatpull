// Explicit country choice only: no IP lookup, GPS, address or postal code.
export const GIFT_COUNTRIES = [['US','United States'],['CA','Canada'],['GB','United Kingdom'],['AU','Australia'],['DE','Germany'],['FR','France'],['IE','Ireland'],['NZ','New Zealand']];
export const validGiftCountry = value => GIFT_COUNTRIES.some(([id])=>id===value);
export const cleanGiftCountry = value => validGiftCountry(value)?value:'US';
export const giftCountryLabel = value => GIFT_COUNTRIES.find(([id])=>id===cleanGiftCountry(value))[1];
