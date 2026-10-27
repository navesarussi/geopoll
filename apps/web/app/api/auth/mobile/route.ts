import { sessionAccount, sessionDisplayName } from "@/lib/auth";
import { mintHandoff, MOBILE_REDIRECT, validChallenge } from "@/lib/mobile-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1–2 of native sign-in (lib/mobile-auth.ts). Redirect target is fixed; never taken from the request. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const cc = u.searchParams.get("cc");
  if (!validChallenge(cc)) return Response.json({ error: "bad_request" }, { status: 400 });
  const acct = await sessionAccount();
  if (!acct) {
    const back = `/api/auth/mobile?cc=${cc}`;
    return Response.redirect(new URL(`/api/auth/signin?callbackUrl=${encodeURIComponent(back)}`, u.origin), 302);
  }
  const code = await mintHandoff(acct, await sessionDisplayName(), cc);
  return new Response(null, { status: 302, headers: { location: `${MOBILE_REDIRECT}?code=${encodeURIComponent(code)}`, "cache-control": "no-store" } });
}
