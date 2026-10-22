// Public search identity; no account or celebration data belongs in this graph.
export const SANTA_ORIGIN = "https://secretsantageneratorapp.com";
export const PICKER_ORIGIN = "https://onlinenamepickertool.com";
export function siteIdentity(picker = false) {
  const origin = picker ? PICKER_ORIGIN : SANTA_ORIGIN;
  return [
    { "@type": "Organization", "@id": `${SANTA_ORIGIN}/#organization`, name: "Hatpull", url: `${SANTA_ORIGIN}/`, email: "hello@secretsantageneratorapp.com", logo: `${SANTA_ORIGIN}/icon.svg`, parentOrganization: { "@type": "Organization", name: "Teregna LLC" } },
    { "@type": "WebSite", "@id": `${origin}/#website`, name: picker ? "Hatpull Online Name Picker" : "Hatpull", alternateName: picker ? "Online Name Picker" : "Hatpull Secret Santa Generator", url: `${origin}/`, inLanguage: "en", publisher: { "@id": `${SANTA_ORIGIN}/#organization` } },
  ];
}
