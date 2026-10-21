import { NextResponse } from "next/server";

// One codebase, two sites:
//  - onlinenamepickertool.com  -> name picker at "/"
//  - secretsantageneratorapp.com -> Secret Santa landing at "/"
//  - drawnamesonlinetool.com   -> 301 to the Secret Santa site
export const SANTA_HOST = "secretsantageneratorapp.com";
export const PICKER_HOST = "onlinenamepickertool.com";

export function middleware(req) {
  const host = (req.headers.get("host") || "").toLowerCase().replace(/^www\./, "").split(":")[0];
  const url = req.nextUrl.clone();

  if (host === "drawnamesonlinetool.com") {
    return NextResponse.redirect(`https://${SANTA_HOST}${url.pathname === "/" ? "" : url.pathname}${url.search}`, 301);
  }
  if (host === SANTA_HOST && url.pathname === "/") {
    url.pathname = "/secret-santa-generator";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/|api/|favicon.ico|icon|apple-icon|manifest|robots.txt|sitemap.xml).*)"] };
