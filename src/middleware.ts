import { NextResponse, type NextRequest } from "next/server";

// Fast gate: no session cookie at all → straight to the sign-in page.
// Full validation (expiry, deactivated users, revoked sessions) happens server-side in currentUser().
export function middleware(req: NextRequest) {
  if (req.cookies.get("ats_sessions")?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/jobs/:path*", "/candidates/:path*", "/team/:path*", "/account/:path*"],
};
