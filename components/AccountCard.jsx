"use client";
import { useState } from 'react';
import { PROFILE_ICONS, profileSymbol } from '@/lib/account-profile.mjs';

function Icon({ name }) {
  const paths = { picture: <><rect x="3" y="3" width="18" height="18" rx="9"/><circle cx="9" cy="8" r="1"/><path d="m4 16 5-5 4 4 3-3 5 5"/></>, email: <><circle cx="12" cy="12" r="4"/><path d="M16 8v6a2 2 0 0 0 4 0v-2a8 8 0 1 0-3 6"/></>, lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>, settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>, trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></> };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function AccountGifts() { return <div className="account-menu-gifts account-profile-gifts" aria-hidden="true">{[0,1,2,3,4].map(i => <span key={i}><i/><b/></span>)}</div>; }

export default function AccountCard({ user, preferences, consent, onPreferences, onIcon, onEmail, onExport, onDelete, onSignOut, busy, armed }) {
  const [section, setSection] = useState(null), [email, setEmail] = useState(''), [working, setWorking] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  function toggle(next) { setSection(section === next ? null : next); setError(''); setNotice(''); }
  async function run(action) { setWorking(true); setError(''); setNotice(''); try { await action(); } catch (e) { setError(e.message || 'Please try again.'); } finally { setWorking(false); } }
  const row = (id, label, icon, danger = false) => <button type="button" className={`account-profile-row${danger ? ' account-profile-danger' : ''}`} aria-expanded={section === id} aria-controls={`account-${id}`} onClick={() => toggle(id)}><Icon name={icon}/><span>{label}</span><span className="account-profile-chevron" aria-hidden="true">›</span></button>;
  return <div className="account-profile-page"><h1 className="sr-only">My account</h1><AccountGifts/><section className="account-profile-card" aria-label="My account">
    <div className="account-profile-cover"/>
    <button className="account-profile-avatar" type="button" aria-label="Change profile picture" onClick={() => toggle('picture')}>{profileSymbol(user)}<span aria-hidden="true">+</span></button>
    <div className="account-profile-content">
      <div className="account-profile-email">{user.email}</div>
      <div className="account-profile-divider"/>
      {row('picture', 'Change profile picture', 'picture')}
      {section === 'picture' && <div className="account-profile-expanded" id="account-picture"><p>Choose a picture for your account.</p><div className="account-avatar-choices">{['', ...PROFILE_ICONS].map(icon => <button key={icon} type="button" disabled={working} aria-label={icon ? `Use ${icon} profile picture` : 'Use my initial'} aria-pressed={(user.user_metadata?.hatpull_avatar || '') === icon} onClick={() => run(async () => { await onIcon(icon); setNotice('Profile picture saved.'); })}>{icon || (user.email || 'A').slice(0,1).toUpperCase()}</button>)}</div></div>}
      {row('email', 'Change email address', 'email')}
      {section === 'email' && <form className="account-profile-expanded stack" id="account-email" onSubmit={e => { e.preventDefault(); run(async () => { const updated = await onEmail(email); setNotice(updated?.email?.toLowerCase() === email.trim().toLowerCase() ? 'Email address updated.' : 'Check your inboxes for the confirmation instructions. Your address stays unchanged until confirmed.'); }); }}><label htmlFor="account-new-email">New email address</label><input id="account-new-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><p>You may need to confirm from both your current and new email addresses.</p><button type="submit" className="btn small" disabled={working}>{working ? 'Sending…' : 'Send confirmation'}</button></form>}
      {row('signin', 'Sign-in options', 'lock')}
      {section === 'signin' && <div className="account-profile-expanded" id="account-signin"><p>Hatpull uses Google or a one-time email code. There’s no Hatpull password to remember or reset.</p><p>For Google password changes, use your Google Account settings.</p></div>}
      {row('preferences', 'Email preferences & data', 'settings')}
      {section === 'preferences' && <div className="account-profile-expanded stack" id="account-preferences"><h2>Email preferences</h2>{preferences ? <><label className="check"><input type="checkbox" checked={!!preferences.reminders} onChange={e => onPreferences({reminders:e.target.checked})}/>Celebration reminders (a week before and the day before)</label><label className="check"><input type="checkbox" checked={!!preferences.marketing} onChange={e => onPreferences({marketing:e.target.checked})}/>{consent}</label><p>Every email has a one-click unsubscribe link.</p></> : <p>Loading preferences…</p>}<h2>Your data</h2><p>Download the information held about your account.</p><button className="btn small ghost" type="button" disabled={working} onClick={() => run(onExport)}>Download my data</button></div>}
      <div className="account-profile-divider"/>
      {row('delete', 'Delete account', 'trash', true)}
      {section === 'delete' && <div className="account-profile-expanded stack" id="account-delete"><p>This removes your sign-in, email preferences and email history. Names remain in their celebrations, but are no longer linked to you. You’ll lose organizer access, and organizer links cannot reclaim your groups. Delete unwanted groups first.</p><button type="button" className="btn account-delete-confirm" disabled={busy} onClick={onDelete}>{busy ? 'Deleting…' : armed ? 'Confirm: delete my account' : 'Delete my account'}</button></div>}
      {error && <p className="account-profile-feedback err" role="alert">{error}</p>}{notice && <p className="account-profile-feedback" role="status">{notice}</p>}
    </div>
  </section><button type="button" className="link account-profile-signout" onClick={onSignOut}>Sign out</button></div>;
}
