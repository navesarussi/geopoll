"use client";
import { useEffect, useState } from "react";
import type { ClientPoll } from "./VoteClient";

type Post = { id: number; parent_id: number | null; display_name: string; option_id: string | null; body: string; created_at: string; deleted: boolean; mine?: boolean; anon?: boolean; pid?: string | null; avatar?: string | null };
type Data = { label: string; counts: Record<string, number>; posts: Post[]; me: { hasProfile: boolean; consented: boolean; defaultAnonymous: boolean } | null };
const ERR: Record<string, string> = {
  too_long: "הטקסט ארוך מדי.", profanity: "הטקסט מכיל מילים פוגעניות.", rate_limited: "יותר מדי פרסומים. נסו שוב בעוד כמה דקות.",
  duplicate_position: "כבר פרסמת עמדה. אפשר למחוק אותה ולפרסם חדשה.", no_parent: "התגובה כבר לא קיימת.", bad_option: "בחרו עמדה.",
  unauthenticated: "צריך להתחבר.", bad_request: "חסר טקסט.",
  no_profile: "כדי לפרסם בשמך צריך קודם ליצור פרופיל (או לבחור לפרסם באנונימיות).", consent_required: "צריך לאשר שהעמדה תפורסם בפומבי תחת הפרופיל שלך.",
};

export default function Survey({ signedIn, poll }: { signedIn: boolean; poll: ClientPoll }) {
  const optText = (id: string | null) => poll.options.find((o) => o.id === id)?.text ?? "";
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<string>("");
  const [anon, setAnon] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const load = () => fetch(`/api/posts?poll=${encodeURIComponent(poll.id)}`).then((r) => r.json()).then(setD).catch(() => {});
  useEffect(() => { load(); }, []);
  const anonymous = anon ?? d?.me?.defaultAnonymous ?? false;
  const needConsent = !anonymous && !!d?.me && !d.me.consented;
  const identity = { anonymous, consent };

  async function send(payload: object, after: () => void) {
    setMsg("");
    try {
      const r = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pollId: poll.id, ...payload }) });
      const j = await r.json();
      if (!j.ok) return setMsg(ERR[j.error] ?? "הפרסום נכשל. נסו שוב.");
      after(); setMsg("פורסם ✓"); load();
    } catch { setMsg("הפרסום נכשל. בדקו חיבור ונסו שוב."); }
  }
  const del = async (id: number) => { if (confirm("למחוק?")) { await fetch(`/api/posts/${id}`, { method: "DELETE" }); load(); } };
  const report = async (id: number) => { await fetch(`/api/posts/${id}/report`, { method: "POST" }); setMsg("הדיווח התקבל, תודה."); };

  const roots = d?.posts.filter((p) => p.parent_id == null) ?? [];
  const kids = (id: number) => d?.posts.filter((p) => p.parent_id === id) ?? [];
  const total = Object.values(d?.counts ?? {}).reduce((a, b) => a + b, 0);

  const Item = ({ p, depth }: { p: Post; depth: number }) => (
    <div className="post" style={{ marginInlineStart: depth * 14 }}>
      {p.deleted ? <p className="small">[נמחק]</p> : <>
        <p className="meta">{p.pid ? <a href={`/u/${p.pid}`}><b>{p.avatar} {p.display_name}</b></a> : <b>{p.display_name}</b>}{p.option_id && <> · עמדה: <b>{optText(p.option_id)}</b></>}</p>
        <p className="body">{p.body}</p>
        <div className="actions">
          {signedIn && depth < 3 && <button className="link" onClick={() => { setReplyTo(p.id); setReply(""); }}>הגב</button>}
          {signedIn && !p.mine && <button className="link" onClick={() => report(p.id)}>דווח</button>}
          {p.mine && <button className="link" onClick={() => del(p.id)}>מחק</button>}
        </div>
        {replyTo === p.id && (
          <div className="stack">
            <textarea maxLength={300} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="תגובה (עד 300 תווים)" />
            <button onClick={() => send({ parentId: p.id, body: reply, ...identity }, () => setReplyTo(null))}>שלח תגובה</button>
          </div>
        )}
      </>}
      {kids(p.id).map((k) => <Item key={k.id} p={k} depth={depth + 1} />)}
    </div>
  );

  return (
    <section className="survey">
      <h2>סקר עמדות פומבי</h2>
      <p className="badge2">{d?.label ?? "עמדות פומביות - לא התוצאה הרשמית"}</p>
      <p className="small">רשות בלבד. מה שתכתבו כאן גלוי לכולם, תחת הפרופיל שלכם או באנונימיות לבחירתכם. אין שום קשר להצבעה החשאית, ואי אפשר לבדוק אם העמדה תואמת את ההצבעה.</p>
      {total > 0 && <p className="small">{total} עמדות פומביות: {poll.options.map((o) => `${o.text} ${d!.counts[o.id] ?? 0}`).join(" · ")}</p>}
      {signedIn && d?.me && (
        <div className="identity">
          <label><input type="checkbox" checked={anonymous} onChange={(e) => setAnon(e.target.checked)} /> לפרסם באנונימיות</label>
          <p className="small">{anonymous
            ? "יוצג כינוי אנונימי שקבוע לדיון הזה. הציבור לא יכול לקשר אותו לפרופיל שלך."
            : <>הפרסום יופיע תחת הפרופיל שלך. {!d.me.hasProfile && <a href="/profile">ליצירת פרופיל</a>}</>}</p>
          {needConsent && d.me.hasProfile && (
            <label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> אני מבין/ה שהעמדה שלי תפורסם בפומבי תחת הפרופיל שלי. עמדה פוליטית היא מידע רגיש, ואפשר למחוק אותה בכל עת.</label>
          )}
        </div>
      )}
      {signedIn && !open && <button className="secondary" onClick={() => setOpen(true)}>לפרסם עמדה פומבית</button>}
      {signedIn && open && (
        <div className="stack">
          <select value={option} onChange={(e) => setOption(e.target.value)}>
            <option value="">בחרו עמדה…</option>
            {poll.options.map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
          </select>
          <textarea maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="למה? (עד 500 תווים)" />
          <button onClick={() => send({ option, body, ...identity }, () => { setOpen(false); setBody(""); })}>פרסם בפומבי</button>
        </div>
      )}
      {msg && <p className="info" role="status">{msg}</p>}
      {roots.length === 0 ? <p className="small">עוד אין עמדות.</p> : roots.slice().reverse().map((p) => <Item key={p.id} p={p} depth={0} />)}
    </section>
  );
}
