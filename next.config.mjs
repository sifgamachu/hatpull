/** @type {import('next').NextConfig} */
const SB = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rkpglmwjpwbrxbluvsqm.supabase.co").origin; } catch { return "https://rkpglmwjpwbrxbluvsqm.supabase.co"; } })();
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${SB}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: CSP },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};
export default nextConfig;
