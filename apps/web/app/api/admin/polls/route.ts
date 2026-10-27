import { sessionAdmin } from "@/lib/admin";
import { parseOptions, savePoll, type PollInput } from "@/lib/polls";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Form POST from /admin?tab=polls. Same-origin, allowlisted admins only; result + rejections are audit-logged. */
export async function POST(req: Request) {
  const admin = await sessionAdmin();
  if (!admin) return new Response("forbidden", { status: 403 });
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin || new URL(origin).host !== host) return new Response("bad origin", { status: 403 });
  const f = await req.formData();
  const v = (k: string) => String(f.get(k) ?? "").slice(0, 4000);
  const ver = v("version");
  const input: PollInput = {
    id: v("id").trim(), kind: v("kind"),
    question: { he: v("question_he"), en: v("question_en") },
    source: { he: v("source_he"), en: v("source_en") },
    options: parseOptions(v("options")),
  };
  const r = await savePoll(await stores(), admin.email, input, ver ? Number(ver) : null);
  const lang = /^[a-z]{2}$/.test(v("lang")) ? v("lang") : "he";
  const q = new URLSearchParams({ tab: "polls", lang, ...(r.ok ? { saved: input.id } : { error: r.error, edit: ver ? input.id : "" }) });
  return Response.redirect(new URL(`/admin?${q}`, req.url), 303);
}
