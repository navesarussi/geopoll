import { runAdminAction, sessionAdmin, type AdminAction } from "@/lib/admin";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["poll_open", "poll_close", "hide", "unhide", "delete", "clear", "ban", "unban"];

/** Form POST from /admin. Same-origin only; every action is written to the audit log. */
export async function POST(req: Request) {
  const admin = await sessionAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin || new URL(origin).host !== host) return new Response("bad origin", { status: 403 });
  const f = await req.formData();
  const action = String(f.get("action") ?? "");
  if (!ACTIONS.includes(action)) return new Response("bad request", { status: 400 });
  const a = (action.startsWith("poll_")
    ? { action, pollId: String(f.get("pollId") ?? "") }
    : { action, postId: Number(f.get("postId")), reason: String(f.get("reason") ?? "").slice(0, 200) }) as AdminAction;
  await runAdminAction(await stores(), admin.email, a);
  const back = String(f.get("back") ?? "/admin");
  return Response.redirect(new URL(back.startsWith("/admin") ? back : "/admin", req.url), 303);
}
