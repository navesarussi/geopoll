import { dashboard, sessionAdmin } from "@/lib/admin";
import { stores } from "@/lib/store";
import { pageLang, tr, type Dict } from "@/lib/i18n";
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

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; lang?: string }> }) {
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
      {tab === "polls" && (
        <section>
          <p className="small">{t.ad_pollsNote}</p>
          <table><thead><tr><th>{t.ad_id}</th><th>{t.ad_kind}</th><th>{t.ad_question}</th><th>{t.ad_status}</th><th>{t.ad_blackout}</th><th></th></tr></thead>
            <tbody>{d.polls.map((p) => (<tr key={p.id}><td><code>{p.id}</code></td><td>{p.kind}</td><td>{p.question}</td><td>{p.status === "open" ? t.ad_open : t.ad_closed}</td><td>{p.blackout ? t.ad_active : "—"}</td>
              <td>{p.status === "open" ? <Act action="poll_close" pollId={p.id} back={back} label={t.ad_close} danger /> : <Act action="poll_open" pollId={p.id} back={back} label={t.ad_openAct} />}</td></tr>))}</tbody></table>
        </section>
      )}
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
