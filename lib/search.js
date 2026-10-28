// Public search identity; no account or celebration data belongs in this graph.
export const SANTA_ORIGIN = "https://hatpull.com";
export const PICKER_ORIGIN = "https://onlinenamepickertool.com";
export const PICKER_GUIDE_PATH = "/random-name-picker-guide";
export const pickerMetadata = {
  title: { absolute: "Random Name Picker & Name Wheel — Free Online | Hatpull" },
  description: "Pick a random name from your list with Hatpull's free name wheel. Add up to 1,000 entries, remove winners for draws without repeats, and use it without signing up.",
  alternates: { canonical: `${PICKER_ORIGIN}/` },
  verification: { other: { "msvalidate.01": "F4861D58DE9F22DD604DD37B0F0CE192" } },
  openGraph: { title: "Free Random Name Picker & Name Wheel | Hatpull", description: "Pick from your own list for classrooms, giveaways and meeting turns. Up to 1,000 entries, no sign-up.", url: `${PICKER_ORIGIN}/`, siteName: "Hatpull Online Name Picker", type: "website", images: [{ url: `${PICKER_ORIGIN}/name-picker/opengraph-image`, width: 1200, height: 630 }] },
};
export function siteIdentity(picker = false) {
  const origin = picker ? PICKER_ORIGIN : SANTA_ORIGIN;
  return [
    { "@type": "Organization", "@id": `${SANTA_ORIGIN}/#organization`, name: "Hatpull", url: `${SANTA_ORIGIN}/`, email: "hello@secretsantageneratorapp.com", logo: `${SANTA_ORIGIN}/icon.svg`, parentOrganization: { "@type": "Organization", name: "Teregna LLC" } },
    { "@type": "WebSite", "@id": `${origin}/#website`, name: picker ? "Hatpull Online Name Picker" : "Hatpull", alternateName: picker ? "Online Name Picker" : "Hatpull Secret Santa Generator", url: `${origin}/`, inLanguage: "en", publisher: { "@id": `${SANTA_ORIGIN}/#organization` } },
  ];
}
