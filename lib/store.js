"use client";
// Per-browser record of the celebrations this person organizes or joined, with their private tokens.
const K = "hatpull.v1";
const load = () => { try { return JSON.parse(localStorage.getItem(K)) || { groups: {} }; } catch { return { groups: {} }; } };
const save = s => { try { localStorage.setItem(K, JSON.stringify(s)); window.dispatchEvent(new Event("hatpull:groups")); } catch {} };
export const getG = gid => load().groups[gid] || null;
export const setG = (gid, patch) => { const s = load(); s.groups[gid] = { ...(s.groups[gid] || {}), ...patch, gid }; save(s); };
export const delG = gid => { const s = load(); delete s.groups[gid]; save(s); };
export const allG = () => Object.values(load().groups);
