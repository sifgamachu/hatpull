import { Suspense } from "react";
import Callback from "@/components/AuthCallback";
export const metadata = { title: "Signing in", robots: { index: false } };
export default function Page() { return <div className="page"><Suspense><Callback /></Suspense></div>; }
