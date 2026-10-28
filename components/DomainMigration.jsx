"use client";
import { useEffect } from 'react';

export default function DomainMigration() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.hostname !== 'hatpull.com' || url.searchParams.get('__hatpull_moved') !== '1') return;
    url.searchParams.delete('__hatpull_moved');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);
  return null;
}
