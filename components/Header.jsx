import Link from "next/link";
import AccountButton from "./AccountButton";
export default function Header() {
  return (
    <header className="top">
      <Link className="brand" href="/" aria-label="Home">
        <svg className="b-n" viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="6" width="18" height="16" rx="2" fill="var(--pine)" /><rect x="3" y="21" width="26" height="5" rx="2.5" fill="var(--pine)" /><rect x="7" y="17" width="18" height="3" fill="var(--ribbon)" /></svg>
        <svg className="b-x" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23C6 14 12 7 20 8c4 .5 6.5 3.5 7.5 7-2-1.6-4-2-5-1.4L23 23z" fill="#C62F42" /><circle cx="27.5" cy="16" r="3" fill="#FFFFFF" stroke="#E6E1D6" /><rect x="3" y="21.5" width="22" height="6" rx="3" fill="#FFFFFF" stroke="#E6E1D6" /></svg>
        Hatpull
      </Link>
      <nav className="row" style={{ gap: 6, justifyContent: "flex-end" }} aria-label="Main">
        <Link className="navlink" href="/name-picker">Name Picker</Link>
        <Link className="navlink" href="/secret-santa-generator">Secret Santa</Link>
        <Link className="navlink" href="/my">My celebrations</Link>
        <Link className="navlink" href="/gift-finder">Gift Finder</Link>
        <AccountButton />
        <Link className="btn small" href="/new">Draw names</Link>
      </nav>
    </header>
  );
}
