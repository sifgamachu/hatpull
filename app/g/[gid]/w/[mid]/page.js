import WishList from "@/components/WishList";
export const metadata = { title: "Wish list", robots: { index: false } };
export default function Page({ params }) { return <div className="page"><WishList gid={params.gid} mid={params.mid} /></div>; }
