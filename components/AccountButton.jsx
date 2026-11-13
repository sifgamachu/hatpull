"use client";
import { profileSymbol } from "@/lib/account-profile.mjs";
import { useUser } from "@/lib/auth";
export default function AccountButton({ onOpen }) {
  const user = useUser();
  const initial = profileSymbol(user);
  return <button type="button" className={user ? "account-menu-avatar" : "navlink linkish"} onClick={onOpen} aria-label="Open account menu" aria-haspopup="dialog">{user ? initial : "Account"}</button>;
}
