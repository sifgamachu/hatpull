import { Suspense } from "react";
import Wizard from "@/components/Wizard";
export const metadata = { title: "Start a Secret Santa", description: "Set up your Secret Santa in a minute: add names, set exclusions, pick a date and budget.", alternates: { canonical: "https://secretsantageneratorapp.com/new" } };
export default function Page() { return <div className="page"><Suspense fallback={<div className="narrow panel muted">Loading…</div>}><Wizard /></Suspense></div>; }
