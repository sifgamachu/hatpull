export const DRAFT_KEY = "hatpull.wizard";
export function readWizardDraft(storage, query, now = Date.now()) {
  try {
    const draft = JSON.parse(storage?.getItem(DRAFT_KEY) || "null");
    if (!draft || draft.q !== query || !Number.isFinite(draft.at) || now < draft.at || now - draft.at >= 6 * 3600e3) return null;
    const s = draft.st;
    if (!s || !Number.isInteger(s.step) || s.step < 0 || s.step > 7 || !Array.isArray(s.names) || !s.names.every(n => typeof n === "string") || !s.excl || typeof s.excl !== "object" || !Object.values(s.excl).every(v => Array.isArray(v) && v.every(x => typeof x === "string"))) return null;
    for (const k of ["orgName", "occ", "name", "date", "budget", "cur", "note"]) if (typeof s[k] !== "string") return null;
    return s;
  } catch { return null; }
}
