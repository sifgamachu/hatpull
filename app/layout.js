import "./globals.css";
import "@fontsource-variable/outfit";
import "@fontsource/young-serif/400.css";
import "@fontsource/jetbrains-mono/500.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteAnalytics from "@/components/SiteAnalytics";
import AuthSync from "@/components/AuthSync";

export const metadata = {
  metadataBase: new URL("https://hatpull.com"),
  title: { default: "Secret Santa Generator & Online Name Picker | Hatpull", template: "%s | Hatpull" },
  description: "Draw names for Secret Santa online for free, share wish lists, and pick random names with a spinning wheel. Organizers sign in; participants join by invitation link.",
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  applicationName: "Hatpull",
  appleWebApp: { capable: true, title: "Hatpull", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F2F5F1" }, { media: "(prefers-color-scheme: dark)", color: "#0E1C19" }] };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="impact-site-verification" value="360a2dd2-b509-4941-a589-089eedb1e223" />
      </head>
      <body>
        <a className="skip" href="#app">Skip to content</a>
        <div className="wrap">
          <Header />
          <main id="app">{children}</main>
          <Footer />
        </div>
        <SiteAnalytics />
        <AuthSync />
      </body>
    </html>
  );
}
