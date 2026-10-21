const COLORS = ["#D9384B", "#EDC25E", "#3E9A6B", "#7FB8E8"];
export default function Lights({ n = 14 }) {
  return (
    <div className="lights" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} style={{ "--c": COLORS[i % 4], "--d": `${((i * 0.37) % 2.4).toFixed(2)}s` }} />)}
    </div>
  );
}
