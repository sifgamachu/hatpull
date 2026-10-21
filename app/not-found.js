import Link from "next/link";
export default function NotFound() {
  return <div className="narrow panel stack" style={{ marginTop: 24 }}><h1 style={{ fontSize: 28 }}>Page not found</h1><p className="muted">This page doesn't exist or has moved.</p><div className="row"><Link className="btn" href="/secret-santa-generator">Secret Santa generator</Link><Link className="btn ghost" href="/">Name picker</Link></div></div>;
}
