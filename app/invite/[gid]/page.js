import Invite from "@/components/Invite";
export const metadata = { title: "Invite your group", robots: { index: false } };
export default function Page({ params }) { return <div className="page"><Invite gid={params.gid} /></div>; }
