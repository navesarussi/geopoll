"use client";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { RSABSSA } from "@cloudflare/blindrsa-ts";
import type { Dict } from "@/lib/i18n";
import type { PublicResults } from "@/lib/results";
import Survey from "./Survey";
import { deviceNullifier } from "@/lib/nullifier-client";

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
type Token = { epoch: string; tier?: string; preparedMsg: string; signature: string };
const KEY = "geopoll.token.v2";
export type ClientPoll = { id: string; kind: string; dummy: boolean; source: string; question: string; options: { id: string; text: string }[] };

/** Gets (or reuses) this epoch's anonymous token. Server signs blindly; we unblind locally. */
async function getToken(): Promise<Token> {
  const { keys, epoch } = await (await fetch("/api/identity/pubkey")).json();
  const saved = localStorage.getItem(KEY);
  if (saved) { const t = JSON.parse(saved) as Token; if (t.epoch === epoch && t.tier) return t; }
  const tr = await fetch("/api/identity/tier");
  if (!tr.ok) throw new Error("issue_failed");
  const { tier } = await tr.json();
  if (!tier) throw new Error("no_tier");
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const pk = await crypto.subtle.importKey("spki", unb64(keys[tier]), { name: "RSA-PSS", hash: "SHA-384" }, true, ["verify"]);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, "0")).join("");
  const prepared = suite.prepare(new TextEncoder().encode(`geopoll|v2|${epoch}|${tier}|${nonce}`));
  const { blindedMsg, inv } = await suite.blind(pk, prepared);
  const res = await fetch("/api/identity/issue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ blindedMsg: b64(blindedMsg), tier }) });
  if (res.status === 409) throw new Error((await res.json()).error ?? "already_issued");
  if (!res.ok) throw new Error("issue_failed");
  const { blindSig } = await res.json();
  const sig = await suite.finalize(pk, prepared, unb64(blindSig), inv);
  const t = { epoch, tier, preparedMsg: b64(prepared), signature: b64(sig) };
  localStorage.setItem(KEY, JSON.stringify(t));
  return t;
}

/** Relay URL, inclusion-check flag, k and blackout come from packages/config via the server page (ADR-0022). */
export default function VoteClient({ signedIn, providers, t, poll, kThreshold, blackout, relayUrl: RELAY, inclusionCheck: INCLUSION_CHECK, lang }:
  { signedIn: boolean; providers: string[]; t: Dict; poll: ClientPoll; kThreshold: number; blackout: boolean; relayUrl: string; inclusionCheck: boolean; lang: string }) {
  const MSG: Record<string, string> = { already_issued: t.err_already_issued, bad_token: t.err_bad_token, no_tier: t.err_no_tier,
    tier_mismatch: t.err_tier_mismatch, wrong_epoch: t.err_wrong_epoch, blackout: t.err_blackout, closed: t.err_closed };
  const CHOICE = `geopoll.lastChoice.${poll.id}`;
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [res, setRes] = useState<PublicResults | null>(null);
  const load = () => fetch(`/api/results?poll=${encodeURIComponent(poll.id)}`).then((r) => r.json()).then(setRes).catch(() => {});
  useEffect(() => { load(); setChoice(localStorage.getItem(CHOICE)); }, []);

  async function vote(option: string) {
    setState("sending"); setMsg("");
    try {
      const tok = await getToken();
      // credentials:"omit" — no session cookie reaches the vote API.
      const r = await fetch(`${RELAY}/vote`, { method: "POST", credentials: "omit", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, option, preparedMsg: tok.preparedMsg, signature: tok.signature }) });
      const j = await r.json();
      if (!j.ok) { if (j.error === "wrong_epoch" || j.error === "bad_token") localStorage.removeItem(KEY); throw new Error(j.error); }
      localStorage.setItem(CHOICE, option); // local only, never sent
      setChoice(option); setState("ok");
      setMsg(j.status === "replaced" ? t.voteReplaced : t.voteCreated);
    } catch (e) {
      setState("err"); setMsg(MSG[(e as Error).message] ?? t.voteFailed);
    }
  }

  const [inc, setInc] = useState("");
  async function checkInclusion() {
    setInc(t.incChecking);
    try {
      const saved = localStorage.getItem(KEY);
      if (!saved) return setInc(t.incNoToken);
      const n = await deviceNullifier(poll.id, unb64((JSON.parse(saved) as Token).preparedMsg));
      const r = await (await fetch(`${RELAY}/vote-status`, { method: "POST", credentials: "omit", headers: { "content-type": "application/json" }, body: JSON.stringify({ nullifier: n }) })).json();
      setInc(r.status === "counted" ? t.incCounted : r.status === "queued" ? t.incQueued : t.incNone);
    } catch { setInc(t.incFailed); }
  }
  const label = (id: string) => poll.options.find((o) => o.id === id)?.text;
  const voting = signedIn && !(blackout && poll.kind === "knesset-election");
  return (
    <main>
      <div className="badge">{poll.kind === "knesset-election" ? t.kindKnesset : t.kindReferendum}{poll.dummy && <> · {t.dummyBadge}</>}</div>
      <h1>{poll.question}</h1>
      <p className="small">{poll.source}</p>
      {poll.kind === "knesset-election" && <p className="small" role="note">{t.electionLabel}</p>}
      <h2>{t.secretBallot}</h2>
      {!signedIn ? (
        <div className="stack">
          {providers.includes("google") && <button onClick={() => signIn("google")}>{t.signInGoogle}</button>}
          {providers.includes("demo") && <button className="secondary" onClick={() => signIn("demo")}>{t.signInDemo}</button>}
          {providers.length === 0 && <p>{t.noProvider}</p>}
        </div>
      ) : !voting ? <p className="err" role="alert">{t.err_blackout}</p> : (
        <div className="stack">
          {poll.options.map((o) => (
            <button key={o.id} disabled={state === "sending"} aria-pressed={choice === o.id} className={choice === o.id ? "chosen" : ""} onClick={() => vote(o.id)}>{o.text}</button>
          ))}
          {state === "sending" && <p className="info">{t.sending}</p>}
          {state === "ok" && <p className="ok" role="status">{msg}{choice && <> · {t.youChose}: {label(choice)}</>}</p>}
          {state === "err" && <p className="err" role="alert">{msg} <button className="link" onClick={() => choice && vote(choice)}>{t.retry}</button></p>}
          <p className="small">{t.secretExplainer}</p>
          {INCLUSION_CHECK && <button className="link" onClick={checkInclusion}>{t.checkInclusion}</button>}
          {inc && <p className="small" role="status">{inc} {t.incNote}</p>}
          <a href={`/profile?lang=${lang}`}>{t.myProfile}</a>
          <button className="link" onClick={() => signOut()}>{t.signOut}</button>
        </div>
      )}
      <section className="results" aria-live="polite">
        <h2>{t.results}</h2>
        {!res ? <p>{t.loading}</p> : res.blackout ? <p role="note">{t.blackout}</p> : !res.published ? <p>{t.participants}: {res.participants}. {t.belowK.replace("{k}", String(kThreshold))}</p> : (
          <>
            <p>{t.participants}: {res.participants}</p>
            {poll.options.map((o) => (
              <div key={o.id} className="bar"><span>{o.text}</span><span>{res.percents![o.id]}%</span>
                <div className="fill" style={{ width: `${res.percents![o.id]}%` }} /></div>
            ))}
          </>
        )}
        {res && !res.blackout && <p className="small">{t.updated}: {new Date(res.snapshotAt).toLocaleString(lang, { timeZone: "Asia/Jerusalem" })}. {t.resultsNote}{res.assurance === "basic" && t.basicAssurance}</p>}
        <button className="link" onClick={load}>{t.refresh}</button>
      </section>
      <Survey signedIn={signedIn} poll={poll} t={t} lq={`?lang=${lang}`} />
      <p className="small"><a href={`/privacy?lang=${lang}`}>{t.privacy}</a></p>
    </main>
  );
}
