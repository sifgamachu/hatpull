"use client";
import { useUser } from "@/lib/auth";
export default function AccountButton({ onOpen }) {
  const user = useUser();
  const initial = (user?.user_metadata?.full_name || user?.email || "A").slice(0, 1).toUpperCase();
  return <button type="button" className={user ? "account-menu-avatar" : "navlink linkish"} onClick={onOpen} aria-label="Open account menu" aria-haspopup="dialog">{user ? initial : "Account"}</button>;
}
