import PickerPage from "@/components/PickerPage";
export const metadata = {
  title: { absolute: "Online Name Picker: Spin the Wheel to Pick a Random Name" },
  description: "Free online name picker. Paste names, spin the wheel, and pick a random winner for classrooms, raffles and giveaways. No sign-up.",
  alternates: { canonical: "https://onlinenamepickertool.com/" },
  openGraph: { title: "Online Name Picker", description: "Paste names, spin the wheel, pick a random winner.", url: "https://onlinenamepickertool.com/", siteName: "Online Name Picker", type: "website" },
};
export default function Page() { return <PickerPage />; }
