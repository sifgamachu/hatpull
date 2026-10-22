"use client";
import { useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/core";
import { useUser, GOOGLE_CLIENT_ID, EMAIL_SIGNIN } from "@/lib/auth";
import SignIn from "./SignIn";

export default function AccountButton() {
  const user = useUser(); const [open, setOpen] = useState(false);
  if (!GOOGLE_CLIENT_ID && !EMAIL_SIGNIN && !user) return null; // sign-in not switched on yet
  if (user === undefined) return <span className="navlink" aria-hidden="true" style={{ visibility: "hidden" }}>Sign in</span>;
  if (user) return <Link className="navlink" href={SITE.santa + "/account"} title={user.email}>Account</Link>;
  return <><button className="navlink linkish" onClick={() => setOpen(true)}>Sign in</button>{open && <SignIn close={() => setOpen(false)} />}</>;
}
