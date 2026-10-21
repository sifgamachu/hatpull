import PickerPage from "@/components/PickerPage";
export const metadata = {
  title: { absolute: "Online Name Picker: Spin the Wheel to Pick a Random Name" },
  description: "Free online name picker. Paste names, spin the wheel, and pick a random winner. No sign-up.",
  alternates: { canonical: "https://onlinenamepickertool.com/" },
  openGraph: { title: "Online Name Picker", description: "Paste names, spin the wheel, pick a random winner.", url: "https://onlinenamepickertool.com/", siteName: "Online Name Picker", type: "website", images: [{ url: "https://onlinenamepickertool.com/name-picker/opengraph-image", width: 1200, height: 630 }] },
};
export default function Page() { return <PickerPage />; }
