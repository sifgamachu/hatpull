"use client";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { profileSymbol } from "@/lib/account-profile.mjs";
import { useUser, signOut } from "@/lib/auth";
import { Sheet } from "./Sheet";
import SignIn from "./SignIn";
import { SITE } from "@/lib/core";
import AccountButton from "./AccountButton";
export default function Header() {
  const user = useUser();
  const [menu, setMenu] = useState(false), [login, setLogin] = useState(false), [leaving, setLeaving] = useState(false);
  const close = () => setMenu(false);
  const initial = profileSymbol(user);
  const brand = (
      <Link className="brand" href="/" aria-label="Home">
        <svg className="b-n" viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="6" width="18" height="16" rx="2" fill="var(--pine)" /><rect x="3" y="21" width="26" height="5" rx="2.5" fill="var(--pine)" /><rect x="7" y="17" width="18" height="3" fill="var(--ribbon)" /></svg>
        <svg className="b-x" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23C6 14 12 7 20 8c4 .5 6.5 3.5 7.5 7-2-1.6-4-2-5-1.4L23 23z" fill="#C62F42" /><circle cx="27.5" cy="16" r="3" fill="#FFFFFF" stroke="#E6E1D6" /><rect x="3" y="21.5" width="22" height="6" rx="3" fill="#FFFFFF" stroke="#E6E1D6" /></svg>
        Hatpull
      </Link>
  );
  return (
    <header className="top">{brand}
      <div className="header-actions"><AccountButton onOpen={() => setMenu(true)} /><button type="button" className="account-menu-trigger" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}><span aria-hidden="true">☰</span></button></div>
      {menu && createPortal(<Sheet className="account-menu-overlay" onClose={close}>
        <div className="account-menu-top">{brand}<div className="account-menu-controls">{user && <span className="account-menu-avatar" aria-label="Signed in">{initial}</span>}<button className="account-menu-close" type="button" aria-label="Close account menu" onClick={close}>×</button></div></div>
        <h2 className="sr-only">Your Hatpull account</h2>
        <nav className="account-menu-body" aria-label="Your account navigation" onClick={event => { if (event.target.closest('a')) close(); }}>
          <div className="account-menu-group">
            <Link className="account-menu-row account-menu-primary" href={SITE.santa + "/new?occ=0"}>Create a new celebration<span aria-hidden="true">›</span></Link>
            <Link className="account-menu-row" href={SITE.santa + "/new?mode=wish"}>Create a wish list<span aria-hidden="true">›</span></Link>
          </div>
          <div className="account-menu-group">{[["My celebrations", "/my"], ["My wish lists", "/wish-lists"], ["My friends", "/friends"], ["Gift Finder", "/gift-finder"]].map(([label, path]) => <Link className="account-menu-row" key={path} href={SITE.santa + path}>{label}<span aria-hidden="true">›</span></Link>)}</div>
          <div className="account-menu-group"><Link className="account-menu-row" href={SITE.santa + "/account"}>My account<span aria-hidden="true">›</span></Link></div>
          <div className="account-menu-session">{user ? <><span>{user.email}</span><button className="link" type="button" disabled={leaving} onClick={async () => { setLeaving(true); try { await signOut(); close(); } finally { setLeaving(false); } }}>{leaving ? "Signing out…" : "Sign out"}</button></> : <button className="link" type="button" onClick={() => { close(); setLogin(true); }}>Sign in</button>}</div>
          <div className="account-menu-gifts" aria-hidden="true">{[0,1,2,3,4].map(i => <span key={i}><i/><b/></span>)}</div>
        </nav>
      </Sheet>, document.body)}
      {login && <SignIn close={() => setLogin(false)} />}

    </header>
  );
}
