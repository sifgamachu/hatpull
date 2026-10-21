import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteAnalytics from "@/components/SiteAnalytics";

export const metadata = {
  metadataBase: new URL("https://secretsantageneratorapp.com"),
  title: { default: "Secret Santa Generator & Online Name Picker | Hatpull", template: "%s | Hatpull" },
  description: "Draw names for Secret Santa online for free, share wish lists, and pick random names with a spinning wheel. No sign-up needed.",
  applicationName: "Hatpull",
  appleWebApp: { capable: true, title: "Hatpull", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F2F5F1" }, { media: "(prefers-color-scheme: dark)", color: "#0E1C19" }] };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" />
      </head>
      <body>
        <a className="skip" href="#app">Skip to content</a>
        <div className="wrap">
          <Header />
          <main id="app">{children}</main>
          <Footer />
        </div>
        <SiteAnalytics />
      </body>
    </html>
  );
}
