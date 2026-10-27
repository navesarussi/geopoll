import { NextResponse, type NextRequest } from "next/server";

/** #71: carry the UI language across pages. ?lang= wins and is remembered in a cookie; otherwise the cookie is used.
 *  Only the 2-letter code is forwarded; it is re-validated against config locales by pageLang(). */
export function middleware(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("lang");
  const lang = q && /^[a-z]{2}$/.test(q) ? q : req.cookies.get("gp_lang")?.value;
  const h = new Headers(req.headers);
  if (lang && /^[a-z]{2}$/.test(lang)) h.set("x-gp-lang", lang); else h.delete("x-gp-lang");
  const res = NextResponse.next({ request: { headers: h } });
  if (q && /^[a-z]{2}$/.test(q)) res.cookies.set("gp_lang", q, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
export const config = { matcher: ["/((?!api|_next|favicon).*)"] };
