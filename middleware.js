import { NextResponse } from "next/server";

// One codebase, two sites:
//  - onlinenamepickertool.com  -> name picker at "/"
//  - hatpull.com -> Secret Santa landing at "/"
//  - secretsantageneratorapp.com -> permanent redirect to hatpull.com
//  - drawnamesonlinetool.com   -> 301 to the Secret Santa site
export const SANTA_HOST = "hatpull.com";
export const LEGACY_HOST = "secretsantageneratorapp.com";
export const PICKER_HOST = "onlinenamepickertool.com";

export function middleware(req) {
  const host = (req.headers.get("host") || "").toLowerCase().replace(/^www\./, "").split(":")[0];
  const url = req.nextUrl.clone();
  const santaSite = host === SANTA_HOST;


  // Keep original paths and invitation queries. API callbacks retain their
  // registered legacy URL through the matcher exclusion below.
  if (host === LEGACY_HOST) {
    // Older visitors may have cached the previous opposite-direction 301.
    // A fresh URL bypasses it; the app removes this marker after arrival.
    url.searchParams.set('__hatpull_moved', '1');
    return NextResponse.redirect(`https://${SANTA_HOST}${url.pathname}${url.search}`, 308);
  }

  if (host === "drawnamesonlinetool.com") {
    return NextResponse.redirect(`https://${SANTA_HOST}${url.pathname === "/" ? "" : url.pathname}${url.search}`, 301);
  }
  // Consolidate public aliases while preserving query parameters and image routes.
  if ([SANTA_HOST, LEGACY_HOST, PICKER_HOST].includes(host) && req.headers.get("host")?.startsWith("www.")) {
    return NextResponse.redirect(`https://${host}${url.pathname}${url.search}`, 308);
  }
  if (url.pathname === "/name-picker" && [SANTA_HOST, LEGACY_HOST, PICKER_HOST].includes(host)) {
    return NextResponse.redirect(`https://${PICKER_HOST}/${url.search}`, 308);
  }
  if (santaSite && url.pathname === "/random-name-picker-guide") {
    return NextResponse.redirect(`https://${PICKER_HOST}${url.pathname}${url.search}`, 308);
  }
  if (santaSite && url.pathname === "/secret-santa-generator") {
    return NextResponse.redirect(`https://${SANTA_HOST}/${url.search}`, 308);
  }
  // The picker domain serves only the picker; any Secret Santa page moves to its own domain (so invites and
  // "My celebrations" always live on one host).
  if (host === PICKER_HOST && !(["/", "/random-name-picker-guide", "/network-access", "/network-allowlist.txt", "/font-licenses.txt"].includes(url.pathname) || url.pathname.startsWith("/name-picker") || /opengraph-image|robots\.txt|sitemap\.xml/.test(url.pathname))) {
    return NextResponse.redirect(`https://${SANTA_HOST}${url.pathname}${url.search}`, 308);
  }
  if (santaSite && url.pathname === "/") {
    url.pathname = "/secret-santa-generator";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/|api/|favicon.ico|icon|apple-icon|manifest).*)"] };
