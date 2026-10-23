"use client";
import { useEffect, useState } from 'react';

export default function GiftInstall() {
  const [prompt, setPrompt] = useState(null), [message, setMessage] = useState('');
  useEffect(() => {
    if (!['secretsantageneratorapp.com','localhost','127.0.0.1'].includes(location.hostname)) return;
    const available = event => { event.preventDefault(); setPrompt(event); };
    const installed = () => { setPrompt(null); setMessage('Installed. If your device supports it, choose Hatpull from a product’s Share menu.'); };
    window.addEventListener('beforeinstallprompt', available); window.addEventListener('appinstalled', installed);
    navigator.serviceWorker?.register('/gift-share-worker.js').catch(() => {});
    return () => { window.removeEventListener('beforeinstallprompt', available); window.removeEventListener('appinstalled', installed); };
  }, []);
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); await prompt.userChoice; } catch { setMessage('Use your browser’s install option when available.'); }
    setPrompt(null);
  }
  return <div className="gift-share-tip stack"><b>On a supported phone? Share it straight here.</b><p className="small muted">Install Hatpull, then choose <strong>Share → Hatpull</strong> on a product and tap Save. If Hatpull isn’t in your Share menu, use Copy link and Paste & save instead.</p>{prompt && <button className="btn small ghost" onClick={install}>Install Hatpull for easier sharing</button>}{message && <p className="small" role="status">{message}</p>}</div>;
}
