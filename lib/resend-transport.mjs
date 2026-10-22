export async function sendResend(payload, idempotencyKey, { key, fetcher = fetch } = {}) {
  if (!key) throw new Error("Email sending is not configured");
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = new Error(`Email provider ${response.status}`);
    error.status = response.status;
    const after = response.headers.get("retry-after");
    error.retryAfter = /^\d+$/.test(after || "") ? Number(after) : Math.max(0, Math.ceil((Date.parse(after) - Date.now()) / 1000)) || 0;
    throw error;
  }
}
