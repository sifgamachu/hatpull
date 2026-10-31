export class RequestProblem extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Bound the actual streamed size even without Content-Length.
export async function readJsonObject(request, { maxBytes = 1500000, timeoutMs = 10000 } = {}) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestProblem('That request is too large.', 413);
  if (!request.body) throw new RequestProblem('Send a valid JSON object.');
  const reader = request.body.getReader();
  let timer, bytes = 0;
  try {
    const read = async () => {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let text = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) throw new RequestProblem('That request is too large.', 413);
        text += decoder.decode(value, { stream: true });
      }
      const data = JSON.parse(text + decoder.decode());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RequestProblem('Send a valid JSON object.');
      return data;
    };
    return await Promise.race([read(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new RequestProblem('The upload timed out. Please try again.', 408)), timeoutMs);
    })]);
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (error instanceof RequestProblem) throw error;
    throw new RequestProblem('Send a valid JSON object.');
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

export function stringArray(value, name, limit, optional = false) {
  if (optional && value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit || value.some(x => typeof x !== 'string')) throw new RequestProblem(`Check the ${name} list.`);
  return value;
}
export function exclusionArray(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 40000 || value.some(x => !x || typeof x !== 'object' || typeof x.a !== 'string' || typeof x.b !== 'string')) throw new RequestProblem('Check the exclusions list.');
  return value;
}
