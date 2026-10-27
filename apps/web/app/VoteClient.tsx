"use client";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { RSABSSA } from "@cloudflare/blindrsa-ts";
import { DEMO_POLL } from "@/lib/poll";
import type { PublicResults } from "@/lib/results";

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
type Token = { epoch: string; preparedMsg: string; signature: string };
const KEY = "geopoll.token";

/** Gets (or reuses) this epoch's anonymous token. Server signs blindly; we unblind locally. */
async function getToken(): Promise<Token> {
  const { spki, epoch } = await (await fetch("/api/identity/pubkey")).json();
  const saved = localStorage.getItem(KEY);
  if (saved) { const t = JSON.parse(saved) as Token; if (t.epoch === epoch) return t; }
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const pk = await crypto.subtle.importKey("spki", unb64(spki), { name: "RSA-PSS", hash: "SHA-384" }, true, ["verify"]);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, "0")).join("");
  const prepared = suite.prepare(new TextEncoder().encode(`geopoll|v1|${epoch}|${nonce}`));
  const { blindedMsg, inv } = await suite.blind(pk, prepared);
  const res = await fetch("/api/identity/issue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ blindedMsg: b64(blindedMsg) }) });
  if (res.status === 409) throw new Error("already_issued");
  if (!res.ok) throw new Error("issue_failed");
  const { blindSig } = await res.json();
  const sig = await suite.finalize(pk, prepared, unb64(blindSig), inv);
  const t = { epoch, preparedMsg: b64(prepared), signature: b64(sig) };
  localStorage.setItem(KEY, JSON.stringify(t));
  return t;
}

const MSG: Record<string, string> = {
  already_issued: "כבר הונפק לחשבון הזה כרטיס הצבעה בתקופה הנוכחית, אבל הוא לא נמצא במכשיר הזה. בגרסת ההדגמה אי אפשר לשחזר אותו.",
  bad_token: "כרטיס ההצבעה לא תקין.",
  wrong_epoch: "כרטיס ההצבעה פג תוקף (תקופה חדשה). נסו שוב.",
};

export default function VoteClient({ signedIn, providers }: { signedIn: boolean; providers: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [res, setRes] = useState<PublicResults | null>(null);
  const load = () => fetch("/api/results").then((r) => r.json()).then(setRes).catch(() => {});
  useEffect(() => { load(); setChoice(localStorage.getItem("geopoll.lastChoice")); }, []);

  async function vote(option: string) {
    setState("sending"); setMsg("");
    try {
      const t = await getToken();
      // credentials:"omit" — no session cookie reaches the vote API.
      const r = await fetch("/api/vote", { method: "POST", credentials: "omit", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId: DEMO_POLL.id, option, preparedMsg: t.preparedMsg, signature: t.signature }) });
      const j = await r.json();
      if (!j.ok) { if (j.error === "wrong_epoch" || j.error === "bad_token") localStorage.removeItem(KEY); throw new Error(j.error); }
      localStorage.setItem("geopoll.lastChoice", option); // local only, never sent
      setChoice(option); setState("ok");
      setMsg(j.status === "replaced" ? "ההצבעה שלך עודכנה ✓ (רק האחרונה נספרת)" : "ההצבעה שלך נקלטה ✓");
    } catch (e) {
      setState("err"); setMsg(MSG[(e as Error).message] ?? "ההצבעה לא נקלטה. בדקו חיבור ונסו שוב.");
    }
  }

  const label = (id: string) => DEMO_POLL.options.find((o) => o.id === id)?.text;
  return (
    <main>
      <div className="badge">{DEMO_POLL.label}</div>
      <h1>{DEMO_POLL.question}</h1>
      {!signedIn ? (
        <div className="stack">
          {providers.includes("google") && <button onClick={() => signIn("google")}>כניסה עם Google</button>}
          {providers.includes("demo") && <button className="secondary" onClick={() => signIn("demo")}>כניסת הדגמה (ללא אימות)</button>}
          {providers.length === 0 && <p>אין ספק התחברות מוגדר.</p>}
        </div>
      ) : (
        <div className="stack">
          {DEMO_POLL.options.map((o) => (
            <button key={o.id} disabled={state === "sending"} className={choice === o.id ? "chosen" : ""} onClick={() => vote(o.id)}>{o.text}</button>
          ))}
          {state === "sending" && <p className="info">שולח…</p>}
          {state === "ok" && <p className="ok" role="status">{msg}{choice && <> · בחרת: {label(choice)}</>}</p>}
          {state === "err" && <p className="err" role="alert">{msg} <button className="link" onClick={() => choice && vote(choice)}>נסו שוב</button></p>}
          <p className="small">ההצבעה חשאית: השרת שמזהה אותך חותם על כרטיס בלי לראות אותו, ושרת ההצבעות מקבל רק את הכרטיס. אפשר לשנות הצבעה עד הסגירה.</p>
          <button className="link" onClick={() => signOut()}>יציאה</button>
        </div>
      )}
      <section className="results">
        <h2>תוצאות (צילום מצב)</h2>
        {!res ? <p>טוען…</p> : !res.published ? <p>משתתפים: {res.participants}. התוצאות יוצגו כשיהיו לפחות 50 משתתפים.</p> : (
          <>
            <p>משתתפים: {res.participants}</p>
            {DEMO_POLL.options.map((o) => (
              <div key={o.id} className="bar"><span>{o.text}</span><span>{res.percents![o.id]}%</span>
                <div className="fill" style={{ width: `${res.percents![o.id]}%` }} /></div>
            ))}
          </>
        )}
        {res && <p className="small">עודכן: {new Date(res.snapshotAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}. התוצאות מתעדכנות באצוות, באחוזים מעוגלים ובטווחים. כוללות קולות דמה.</p>}
        <button className="link" onClick={load}>רענון</button>
      </section>
    </main>
  );
}
