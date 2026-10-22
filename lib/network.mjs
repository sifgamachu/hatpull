// Bound connection waits without retrying writes or bypassing a network policy.
export async function fetchWithTimeout(input, init = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const caller = init.signal || (typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined);
  const abort = () => controller.abort(caller.reason);
  if (caller?.aborted) abort();
  else caller?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("The connection timed out. Check your network or ask your IT team for help.", "TimeoutError")), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", abort);
  }
}
