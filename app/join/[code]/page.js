import Join from "@/components/Join";
export const metadata = { title: "You're invited", robots: { index: false } };
export default async function Page({ params }) { params = await params; return <div className="page"><Join code={params.code} /></div>; }
