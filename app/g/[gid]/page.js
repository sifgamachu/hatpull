import Dashboard from "@/components/Dashboard";
export const metadata = { title: "Your celebration", robots: { index: false } };
export default function Page({ params }) { return <div className="page"><Dashboard gid={params.gid} /></div>; }
