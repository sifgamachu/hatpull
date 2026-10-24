import { createHash } from 'node:crypto';
export const EBAY_NOTIFICATION_URL = 'https://secretsantageneratorapp.com/api/ebay/notifications';
export function ebayChallenge(code, token) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(code) || !/^[A-Za-z0-9_-]{32,80}$/.test(token || '')) return '';
  return createHash('sha256').update(code + token + EBAY_NOTIFICATION_URL).digest('hex');
}
