const ORN = ["#D9384B", "#2F8A5B", "#C9952E", "#3C78B5", "#9B3FA6", "#D16A2C"];
export function Ornament({ name, sm }) {
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className={`orn ${sm ? "orn-sm" : ""}`} style={{ "--oc": ORN[h % ORN.length] }} aria-hidden="true">{String(name).trim()[0]?.toUpperCase() || "?"}</span>;
}
export function Bow() {
  return <svg className="bow" viewBox="0 0 30 22" aria-hidden="true"><path d="M15 11C9 2 2 3 3 9s8 4 12 2zM15 11c6-9 13-8 12-2s-8 4-12 2z" fill="#D9384B" /><path d="M15 11l-5 10M15 11l5 10" stroke="#B02A3C" strokeWidth="2.5" /><circle cx="15" cy="11" r="3" fill="#EDC25E" /></svg>;
}
export function WishBar({ n }) {
  return <div className="wishbar" role="img" aria-label={`${n} ${n === 1 ? "wish" : "wishes"}`}>{[0, 1, 2].map(i => <i key={i} className={i < n ? "on" : ""} />)}</div>;
}
export { Sheet } from "./Sheet";
