"use client";
import { useEffect, useState } from "react";
import type { ClientPoll } from "./VoteClient";
import { localAlias, type Dict } from "@geopoll/i18n";

type Post = { id: number; parent_id: number | null; display_name: string; option_id: string | null; body: string; created_at: string; deleted: boolean; mine?: boolean; anon?: boolean; pid?: string | null; avatar?: string | null };
type Data = { label: string; counts: Record<string, number>; posts: Post[]; me: { hasProfile: boolean; consented: boolean; defaultAnonymous: boolean } | null };

export default function Survey({ signedIn, poll, t, lq = "" }: { signedIn: boolean; poll: ClientPoll; t: Dict; lq?: string }) {
  const errText = (e: string) => (t as Record<string, string>)[`se_${e}`] ?? t.sv_failed;
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
      if (!j.ok) return setMsg(errText(j.error));
      after(); setMsg(t.sv_posted); load();
    } catch { setMsg(t.sv_failedNet); }
  }
  const del = async (id: number) => { if (confirm(t.sv_confirmDelete)) { await fetch(`/api/posts/${id}`, { method: "DELETE" }); load(); } };
  const report = async (id: number) => { await fetch(`/api/posts/${id}/report`, { method: "POST" }); setMsg(t.sv_reported); };

  const roots = d?.posts.filter((p) => p.parent_id == null) ?? [];
  const kids = (id: number) => d?.posts.filter((p) => p.parent_id === id) ?? [];
  const total = Object.values(d?.counts ?? {}).reduce((a, b) => a + b, 0);

  const Item = ({ p, depth }: { p: Post; depth: number }) => (
    <div className="post" style={{ marginInlineStart: depth * 14 }}>
      {p.deleted ? <p className="small">{t.sv_deleted}</p> : <>
        <p className="meta">{p.pid ? <a href={`/u/${p.pid}${lq}`}><b>{p.avatar} {localAlias(t, p.display_name)}</b></a> : <b>{localAlias(t, p.display_name)}</b>}{p.option_id && <> · {t.sv_stance}: <b>{optText(p.option_id)}</b></>}</p>
        <p className="body">{p.body}</p>
        <div className="actions">
          {signedIn && depth < 3 && <button className="link" onClick={() => { setReplyTo(p.id); setReply(""); }}>{t.sv_reply}</button>}
          {signedIn && !p.mine && <button className="link" onClick={() => report(p.id)}>{t.sv_report}</button>}
          {p.mine && <button className="link" onClick={() => del(p.id)}>{t.sv_delete}</button>}
        </div>
        {replyTo === p.id && (
          <div className="stack">
            <textarea maxLength={300} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t.sv_replyPh} />
            <button onClick={() => send({ parentId: p.id, body: reply, ...identity }, () => setReplyTo(null))}>{t.sv_sendReply}</button>
          </div>
        )}
      </>}
      {kids(p.id).map((k) => <Item key={k.id} p={k} depth={depth + 1} />)}
    </div>
  );

  return (
    <section className="survey">
      <h2>{t.sv_title}</h2>
      <p className="badge2">{t.sv_label}</p>
      <p className="small">{t.sv_intro}</p>
      {total > 0 && <p className="small">{t.sv_count.replace("{n}", String(total))}: {poll.options.map((o) => `${o.text} ${d!.counts[o.id] ?? 0}`).join(" · ")}</p>}
      {signedIn && d?.me && (
        <div className="identity">
          <label><input type="checkbox" checked={anonymous} onChange={(e) => setAnon(e.target.checked)} /> {t.sv_anon}</label>
          <p className="small">{anonymous
            ? t.sv_anonNote
            : <>{t.sv_publicNote} {!d.me.hasProfile && <a href={`/profile${lq}`}>{t.sv_createProfile}</a>}</>}</p>
          {needConsent && d.me.hasProfile && (
            <label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {t.sv_consent}</label>
          )}
        </div>
      )}
      {signedIn && !open && <button className="secondary" onClick={() => setOpen(true)}>{t.sv_open}</button>}
      {signedIn && open && (
        <div className="stack">
          <select value={option} onChange={(e) => setOption(e.target.value)}>
            <option value="">{t.sv_choose}</option>
            {poll.options.map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
          </select>
          <textarea maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.sv_why} />
          <button onClick={() => send({ option, body, ...identity }, () => { setOpen(false); setBody(""); })}>{t.sv_postPublic}</button>
        </div>
      )}
      {msg && <p className="info" role="status">{msg}</p>}
      {roots.length === 0 ? <p className="small">{t.sv_none}</p> : roots.slice().reverse().map((p) => <Item key={p.id} p={p} depth={0} />)}
    </section>
  );
}
