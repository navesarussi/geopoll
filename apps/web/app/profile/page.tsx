"use client";
import { useEffect, useState } from "react";

type Me = { profile: { pid: string; displayName: string; bio: string; avatar: string } | null; suggested?: { displayName: string; bio: string; avatar: string }; avatars: string[] };

export default function MyProfile() {
  const [me, setMe] = useState<Me | null>(null);
  const [f, setF] = useState({ displayName: "", bio: "", avatar: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.status === 401) return setMsg("צריך להתחבר.");
      const j: Me = await r.json(); setMe(j);
      const src = j.profile ?? j.suggested!; setF({ displayName: src.displayName, bio: src.bio, avatar: src.avatar });
    });
  }, []);
  async function save() {
    const r = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    if (!j.ok) return setMsg(j.error === "too_long" ? "ארוך מדי." : j.error === "profanity" ? "מכיל מילים פוגעניות." : "חסר שם.");
    setMsg("נשמר ✓"); setMe((m) => m && { ...m, profile: { pid: j.pid, ...f } });
  }
  return (
    <main>
      <h1>הפרופיל הציבורי שלי</h1>
      <p className="small">הפרופיל מוצג ליד עמדות ודיונים שתפרסמו בשמכם. המייל שלכם לעולם לא מוצג. הפרופיל לא מקושר בשום צורה להצבעה החשאית. השם מגיע מ-Google רק כהצעה, ואפשר לשנות אותו.</p>
      {me && (
        <div className="stack">
          <label>שם תצוגה<input maxLength={40} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></label>
          <label>על עצמי (עד 160 תווים)<textarea maxLength={160} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
          <div className="avatars">{me.avatars.map((a) => (
            <button key={a} className={a === f.avatar ? "chosen" : "secondary"} onClick={() => setF({ ...f, avatar: a })} aria-label={`אווטאר ${a}`}>{a}</button>
          ))}</div>
          <button onClick={save}>{me.profile ? "שמירה" : "יצירת פרופיל"}</button>
          {me.profile && <a href={`/u/${me.profile.pid}`}>לצפייה בפרופיל הציבורי</a>}
        </div>
      )}
      {msg && <p className="info" role="status">{msg}</p>}
      <p><a href="/">חזרה</a></p>
    </main>
  );
}
