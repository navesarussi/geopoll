import { dashboard, sessionAdmin } from "@/lib/admin";
import { stores } from "@/lib/store";
import { pageLang, tr, type Dict } from "@/lib/i18n";
import { isAdminPoll, isoToLocal } from "@/lib/polls";
import { bankEnabled, bankById, bankPrefill, bankSize, searchBank } from "@/lib/question-bank";
import { config, polls } from "@/lib/config";
import type { PollDef } from "@geopoll/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "GeoPoll · Admin", robots: { index: false } };

const TABS = [["dash", "ad_tabDash"], ["polls", "ad_tabPolls"], ["mod", "ad_tabMod"], ["audit", "ad_tabAudit"]] as const;
const mkFmt = (lang: string) => (s: string | null) => (s ? new Date(s).toLocaleString(lang, { timeZone: "Asia/Jerusalem" }) : "—");

function Act({ action, back, pollId, postId, label, danger, reason, t }: { action: string; back: string; pollId?: string; postId?: number; label: string; danger?: boolean; reason?: boolean; t?: Dict }) {
  return (
    <form method="post" action="/api/admin/action" className="inline">
      <input type="hidden" name="action" value={action} /><input type="hidden" name="back" value={back} />
      {pollId && <input type="hidden" name="pollId" value={pollId} />}
      {postId != null && <input type="hidden" name="postId" value={postId} />}
      {reason && <input name="reason" placeholder={t?.ad_reason} maxLength={200} required />}
      <button className={danger ? "danger" : ""}>{label}</button>
    </form>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; lang?: string; edit?: string; error?: string; saved?: string; bankq?: string; bank?: string }> }) {
  const sp = await searchParams;
  const { lang, t, dir } = await pageLang(sp.lang);
  const fmt = mkFmt(lang);
  const admin = await sessionAdmin();
  if (!admin) {
    return (<main className="admin" lang={lang} dir={dir}><h1>{t.ad_title}</h1><p>{t.ad_noAccess}</p><a href="/api/auth/signin">{t.ad_signIn}</a></main>);
  }
  const tab = sp.tab ?? "dash";
  const s = await stores();
  const d = await dashboard(s, new Date(), lang);
  const back = `/admin?tab=${tab}&lang=${lang}`;
  return (
    <main className="admin" lang={lang} dir={dir}>
      <header className="admin-head"><h1>GeoPoll · {t.ad_title}</h1><span className="small">{admin.email}</span></header>
      <p className="note">{tr(t, "ad_note", { k: d.k })}</p>
      <nav className="tabs">{TABS.map(([id, l]) => <a key={id} href={`/admin?tab=${id}&lang=${lang}`} aria-current={tab === id ? "page" : undefined}>{t[l]}</a>)}</nav>
      {tab === "dash" && (
        <section>
          <div className="cards">
            <div className="card"><b>{t.ad_lastFlush}</b><span>{fmt(d.lastFlush)}</span></div>
            <div className="card"><b>{t.ad_postsReported}</b><span>{d.content.posts} / {d.content.reported}</span></div>
            <div className="card"><b>{t.ad_hiddenBans}</b><span>{d.content.hidden} / {d.content.bans}</span></div>
            <div className="card"><b>{t.ad_profiles}</b><span>{d.content.profiles}</span></div>
            <div className="card"><b>{t.ad_t2}</b><span>{d.t2Verified}</span></div>
          </div>
          <h2>{t.ad_turnoutByPoll}</h2>
          <table><thead><tr><th>{t.ad_poll}</th><th>{t.ad_status}</th><th>{t.ad_turnout}</th><th>{t.ad_k}</th><th>{t.ad_queued}</th><th>{t.ad_snapshot}</th><th>{t.ad_blackout}</th></tr></thead>
            <tbody>{d.polls.map((p) => (<tr key={p.id}><td>{p.question}{p.dummy && <span className="badge">{t.ad_dummy}</span>}</td><td>{p.status === "open" ? t.ad_open : t.ad_closed}</td>
              <td>{p.turnout}</td><td>{p.passesK ? t.ad_passes : t.ad_below}</td><td>{p.queued}</td><td>{fmt(p.snapshotAt)} · {p.published ? t.ad_published : t.ad_unpublished}</td><td>{p.blackout ? t.ad_active : "—"}</td></tr>))}</tbody></table>
          <h2>{t.ad_health}</h2>
          <table><tbody>
            <tr><td>DB</td><td>{d.health.db} · {t.ad_zones}: {d.health.zonesIsolated ? t.ad_yes : t.ad_noDemo}</td></tr>
            <tr><td>{t.ad_batchMode}</td><td>{d.health.batchMode}</td></tr>
            <tr><td>{t.ad_locales}</td><td>{d.health.locales.join(", ")}</td></tr>
            <tr><td>{t.ad_elections}</td><td>{d.health.elections.join(", ") || t.ad_none}</td></tr>
            <tr><td>{t.ad_flags}</td><td>{Object.entries(d.health.flags).map(([k, v]) => `${k}:${v ? "on" : "off"}`).join(" · ")}</td></tr>
            <tr><td>{t.ad_secrets}</td><td>{Object.entries(d.health.secrets).map(([k, v]) => `${k} ${v ? "✓" : "✗"}`).join(" · ")}</td></tr>
          </tbody></table>
        </section>
      )}
      {tab === "polls" && <Polls back={back} t={t} lang={lang} rows={d.polls} sp={sp} />}
      {tab === "mod" && <Mod back={back} t={t} />}
      {tab === "audit" && <Audit t={t} fmt={fmt} />}
    </main>
  );
}

async function Mod({ back, t }: { back: string; t: Dict }) {
  const q = await (await stores()).content.reportedQueue();
  return (
    <section>
      <p className="small">{t.ad_modNote}</p>
      {!q.length && <p>{t.ad_noReports}</p>}
      <table><tbody>{q.map((p) => (
        <tr key={p.id}><td>#{p.id}<br /><span className="small">{p.poll_id}</span></td>
          <td><b>{p.display_name}</b>{p.anon && <span className="badge2">{t.ad_anon}</span>}<div className="body">{p.body}</div>
            <span className="small">{p.report_count} {t.ad_reports} · {p.hidden ? t.ad_hidden : t.ad_visible}{p.deleted ? ` · ${t.ad_deleted}` : ""}{p.banned ? ` · ${t.ad_banned}` : ""}</span></td>
          <td className="acts">
            {p.hidden ? <Act action="unhide" postId={p.id} back={back} label={t.ad_show} /> : <Act action="hide" postId={p.id} back={back} label={t.ad_hide} />}
            <Act action="clear" postId={p.id} back={back} label={t.ad_clear} />
            {!p.deleted && <Act action="delete" postId={p.id} back={back} label={t.ad_delete} danger />}
            {p.banned ? <Act action="unban" postId={p.id} back={back} label={t.ad_unban} /> : <Act action="ban" postId={p.id} back={back} label={t.ad_ban} danger reason t={t} />}
          </td></tr>))}</tbody></table>
    </section>
  );
}

async function Audit({ t, fmt }: { t: Dict; fmt: (s: string | null) => string }) {
  const rows = await (await stores()).content.auditLog();
  return (
    <section><table><thead><tr><th>{t.ad_when}</th><th>{t.ad_who}</th><th>{t.ad_action}</th><th>{t.ad_target}</th><th>{t.ad_detail}</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{fmt(r.at)}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.target}</td><td>{r.detail}</td></tr>)}</tbody></table>
      {!rows.length && <p>{t.ad_auditEmpty}</p>}</section>
  );
}

type Row = Awaited<ReturnType<typeof dashboard>>["polls"][number];
async function Polls({ back, t, lang, rows, sp }: { back: string; t: Dict; lang: string; rows: Row[]; sp: { edit?: string; error?: string; saved?: string; bankq?: string; bank?: string } }) {
  const tz = config().jurisdiction.timeZone;
  const bankOn = bankEnabled();
  const pre = bankOn && sp.bank && !sp.edit ? bankById(sp.bank) : undefined;
  const pf = pre ? bankPrefill(pre) : undefined;
  const hits = bankOn && sp.bankq ? searchBank(sp.bankq) : [];
  const defs = await (await stores()).ballots.listPollDefs().catch(() => []);
  const editing: PollDef | undefined = sp.edit ? polls().find((p) => p.id === sp.edit && isAdminPoll(p.id)) : undefined;
  const version = editing ? defs.find((d) => d.def.id === editing.id)?.version : undefined;
  const opts = editing ? editing.options.map((o) => `${o.id} | ${o.label.he} | ${o.label.en ?? ""}`).join("\n") : pf?.options ?? "";
  const err = sp.error ? (t as Record<string, string>)[`pe_${sp.error}`] ?? sp.error : "";
  return (
    <section>
      <p className="small">{t.ad_pollsNote}</p>
      {sp.saved && <p className="ok" role="status">{tr(t, "ad_saved", { id: sp.saved })}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <table><thead><tr><th>{t.ad_id}</th><th>{t.ad_kind}</th><th>{t.ad_question}</th><th>{t.ad_status}</th><th>{t.ad_blackout}</th><th></th></tr></thead>
        <tbody>{rows.map((p) => (<tr key={p.id}><td><code>{p.id}</code> <span className="small">{isAdminPoll(p.id) ? t.ad_fromAdmin : t.ad_fromConfig}</span></td><td>{p.kind}</td><td>{p.question}</td><td>{p.status === "open" ? t.ad_open : p.status === "scheduled" ? t.ad_scheduled : t.ad_closed}{p.schedule && <div className="small">{isoToLocal(p.schedule.opensAt, tz).replace("T", " ") || "…"} → {isoToLocal(p.schedule.closesAt, tz).replace("T", " ") || "…"}</div>}</td><td>{p.blackout ? t.ad_active : "—"}</td>
          <td>{p.manual === "open" ? <Act action="poll_close" pollId={p.id} back={back} label={t.ad_close} danger /> : <Act action="poll_open" pollId={p.id} back={back} label={t.ad_openAct} />}
            {isAdminPoll(p.id) && <a href={`/admin?tab=polls&lang=${lang}&edit=${encodeURIComponent(p.id)}`}>{t.ad_edit}</a>}</td></tr>))}</tbody></table>
      <h2>{t.ad_bank}</h2>
      {!bankOn ? <p className="small">{t.ad_bankOff}</p> : (<>
        <p className="small">{tr(t, "ad_bankNote", { n: bankSize() })}</p>
        <form method="get" action="/admin" className="inline"><input type="hidden" name="tab" value="polls" /><input type="hidden" name="lang" value={lang} />
          <input name="bankq" defaultValue={sp.bankq} placeholder={t.ad_bankSearch} dir="ltr" /><button>{t.ad_bankSearch}</button></form>
        {hits.length > 0 && <ul className="bank">{hits.map((h) => <li key={h.id}><a href={`/admin?tab=polls&lang=${lang}&bank=${encodeURIComponent(h.id)}`}>{t.ad_bankUse}</a> <span dir="ltr">{h.q}</span> <span className="small">({h.options.length})</span></li>)}</ul>}
        {sp.bankq && !hits.length && <p className="small">—</p>}
        {pre && <p className="note">{t.ad_bankPrefilled} <code>{pre.id}</code></p>}
      </>)}
      <h2>{editing ? t.ad_editPoll : t.ad_newPoll}</h2>
      <p className="small">{t.ad_rules}</p>
      <form method="post" action="/api/admin/polls" className="stack poll-form" key={editing?.id ?? pre?.id ?? "new"}>
        <input type="hidden" name="lang" value={lang} />
        {editing && <input type="hidden" name="version" value={version ?? ""} />}
        <label>{t.ad_id}<input name="id" required pattern="[a-z0-9][a-z0-9-]{2,47}" defaultValue={editing?.id} readOnly={!!editing} /></label>
        <label>{t.ad_kind}<select name="kind" defaultValue={editing?.kind ?? "referendum"}>
          <option value="referendum">{t.kindReferendum}</option><option value="knesset-election">{t.kindKnesset}</option></select></label>
        <label>{t.ad_question} (he)<input name="question_he" required maxLength={200} defaultValue={editing?.question.he} dir="rtl" /></label>
        <label>{t.ad_question} (en)<input name="question_en" maxLength={200} defaultValue={editing?.question.en ?? pf?.question_en} dir="ltr" /></label>
        <label>{t.ad_source} (he)<input name="source_he" maxLength={300} defaultValue={editing?.source.he} dir="rtl" /></label>
        <label>{t.ad_source} (en)<input name="source_en" maxLength={300} defaultValue={editing?.source.en ?? pf?.source_en} dir="ltr" /></label>
        <label>{t.ad_opensAt}<input type="datetime-local" name="opens_at" defaultValue={isoToLocal(editing?.schedule?.opensAt, tz)} /></label>
        <label>{t.ad_closesAt}<input type="datetime-local" name="closes_at" defaultValue={isoToLocal(editing?.schedule?.closesAt, tz)} /></label>
        <label>{t.ad_optionsHelp}<textarea name="options" rows={6} required defaultValue={opts} placeholder={"yes | בעד | For\nno | נגד | Against"} /></label>
        <button>{editing ? t.ad_saveEdit : t.ad_create}</button>
        {editing && <a href={`/admin?tab=polls&lang=${lang}`}>{t.ad_cancel}</a>}
      </form>
    </section>
  );
}
