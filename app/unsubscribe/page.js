import { Suspense } from "react";
import Unsub from "@/components/Unsubscribe";
export const metadata = { title: "Unsubscribe", robots: { index: false } };
export default function Page() { return <div className="page"><Suspense><Unsub /></Suspense></div>; }
