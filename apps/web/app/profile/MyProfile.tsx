"use client";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

type Me = { profile: { pid: string; displayName: string; bio: string; avatar: string } | null; suggested?: { displayName: string; bio: string; avatar: string }; avatars: string[] };

export default function MyProfile({ t, lq }: { t: Dict; lq: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [f, setF] = useState({ displayName: "", bio: "", avatar: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.status === 401) return setMsg(t.needSignIn);
      const j: Me = await r.json(); setMe(j);
      const src = j.profile ?? j.suggested!; setF({ displayName: src.displayName, bio: src.bio, avatar: src.avatar });
    });
  }, []);
  async function save() {
    const r = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    if (!j.ok) return setMsg(j.error === "too_long" ? t.pf_tooLong : j.error === "profanity" ? t.pf_profanity : t.pf_noName);
    setMsg(t.pf_saved); setMe((m) => m && { ...m, profile: { pid: j.pid, ...f } });
  }
  return (
    <main>
      <h1>{t.pf_title}</h1>
      <p className="small">{t.pf_intro}</p>
      {me && (
        <div className="stack">
          <label>{t.pf_name}<input maxLength={40} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></label>
          <label>{t.pf_bio}<textarea maxLength={160} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
          <div className="avatars">{me.avatars.map((a) => (
            <button key={a} className={a === f.avatar ? "chosen" : "secondary"} onClick={() => setF({ ...f, avatar: a })} aria-label={`${t.pf_avatar} ${a}`}>{a}</button>
          ))}</div>
          <button onClick={save}>{me.profile ? t.pf_save : t.pf_create}</button>
          {me.profile && <a href={`/u/${me.profile.pid}${lq}`}>{t.pf_view}</a>}
        </div>
      )}
      {msg && <p className="info" role="status">{msg}</p>}
      <p><a href={`/${lq}`}>{t.back}</a></p>
    </main>
  );
}
