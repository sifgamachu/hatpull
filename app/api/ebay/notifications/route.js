import { ebayChallenge } from '@/lib/ebay-notifications.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  const challengeResponse = ebayChallenge(new URL(request.url).searchParams.get('challenge_code'), process.env.EBAY_NOTIFICATION_TOKEN);
  return challengeResponse ? Response.json({ challengeResponse }, { headers: { 'Cache-Control': 'no-store' } }) : new Response(null, { status: 400 });
}
export function POST() {
  // Hatpull does not collect or persist eBay user IDs, usernames, buyer/seller
  // profiles, orders, or notification payloads. All such fields are discarded
  // by the catalog allowlist. Acknowledgement has no database side effects.
  // If identity data is introduced, add signature verification and deletion
  // processing here BEFORE collecting it. Do not log notification bodies.
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
