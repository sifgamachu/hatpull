const reply = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

// Auth deletion invokes the database cleanup trigger in the same transaction.
// Never accept a user ID supplied by the caller or retry a destructive request.
export function accountDeletionHandler({ url, publishableKey, secret, fetcher = fetch, timeoutMs = 15000 }) {
  return async request => {
    const authorization = request.headers.get('authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(authorization)) return reply({ error: 'Not signed in.' }, 401);
    if (!secret) return reply({ error: 'Account deletion is temporarily unavailable. Please contact support through hatpull.com/contact.' }, 503);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const who = await fetcher(`${url}/auth/v1/user`, {
        headers: { apikey: publishableKey, authorization }, signal: controller.signal, cache: 'no-store',
      });
      if (who.status === 401 || who.status === 403) return reply({ error: 'Not signed in.' }, 401);
      if (!who.ok) return reply({ error: 'Account service is temporarily unavailable. Please try again.' }, 503);
      const { id } = await who.json();
      if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        return reply({ error: 'Could not verify your account. Please sign in again.' }, 401);
      const result = await fetcher(`${url}/auth/v1/admin/users/${id}`, {
        method: 'DELETE', headers: { apikey: secret, authorization: `Bearer ${secret}` },
        signal: controller.signal, cache: 'no-store',
      });
      return result.ok ? reply({ ok: true }) : reply({ error: 'Could not delete your account. Please try again.' }, 503);
    } catch {
      return reply({ error: 'Could not confirm account deletion. Please check your connection and sign in again to check your account.' }, 503);
    } finally { clearTimeout(timer); }
  };
}
