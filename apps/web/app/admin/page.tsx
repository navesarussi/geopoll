import { dashboard, sessionAdmin } from "@/lib/admin";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "GeoPoll · ניהול", robots: { index: false } };

const TABS = [["dash", "לוח בקרה"], ["polls", "משאלים"], ["mod", "מודרציה"], ["audit", "יומן ביקורת"]] as const;
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—");

function Act({ action, back, pollId, postId, label, danger, reason }: { action: string; back: string; pollId?: string; postId?: number; label: string; danger?: boolean; reason?: boolean }) {
  return (
    <form method="post" action="/api/admin/action" className="inline">
      <input type="hidden" name="action" value={action} /><input type="hidden" name="back" value={back} />
      {pollId && <input type="hidden" name="pollId" value={pollId} />}
      {postId != null && <input type="hidden" name="postId" value={postId} />}
      {reason && <input name="reason" placeholder="סיבה" maxLength={200} required />}
      <button className={danger ? "danger" : ""}>{label}</button>
    </form>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await sessionAdmin();
  if (!admin) {
    return (<main className="admin"><h1>ניהול</h1><p>אין הרשאה. הכניסה לפורטל רק עם חשבון Google שמופיע ברשימת המנהלים.</p><a href="/api/auth/signin">כניסה</a></main>);
  }
  const tab = (await searchParams).tab ?? "dash";
  const s = await stores();
  const d = await dashboard(s);
  const back = `/admin?tab=${tab}`;
  return (
    <main className="admin">
      <header className="admin-head"><h1>GeoPoll · ניהול</h1><span className="small">{admin.email}</span></header>
      <p className="note">הפורטל מציג רק נתונים מצרפיים מעל סף k={d.k}. אין בו גישה למי הצביע מה, ואין קישור בין זהות להצבעה. כל פעולה נרשמת ביומן הביקורת.</p>
      <nav className="tabs">{TABS.map(([id, l]) => <a key={id} href={`/admin?tab=${id}`} aria-current={tab === id ? "page" : undefined}>{l}</a>)}</nav>
      {tab === "dash" && (
        <section>
          <div className="cards">
            <div className="card"><b>אצווה אחרונה</b><span>{fmt(d.lastFlush)}</span></div>
            <div className="card"><b>פוסטים / מדווחים</b><span>{d.content.posts} / {d.content.reported}</span></div>
            <div className="card"><b>מוסתרים / הרחקות</b><span>{d.content.hidden} / {d.content.bans}</span></div>
            <div className="card"><b>פרופילים</b><span>{d.content.profiles}</span></div>
            <div className="card"><b>אומתו T2</b><span>{d.t2Verified}</span></div>
          </div>
          <h2>השתתפות לפי משאל</h2>
          <table><thead><tr><th>משאל</th><th>סטטוס</th><th>השתתפות</th><th>סף k</th><th>בתור</th><th>צילום מצב</th><th>חלון 16ה</th></tr></thead>
            <tbody>{d.polls.map((p) => (<tr key={p.id}><td>{p.question}{p.dummy && <span className="badge">דמה</span>}</td><td>{p.status === "open" ? "פתוח" : "סגור"}</td>
              <td>{p.turnout}</td><td>{p.passesK ? "✓ עובר" : "✗ מתחת"}</td><td>{p.queued}</td><td>{fmt(p.snapshotAt)} {p.published ? "· מפורסם" : "· לא מפורסם"}</td><td>{p.blackout ? "פעיל" : "—"}</td></tr>))}</tbody></table>
          <h2>בריאות מערכת</h2>
          <table><tbody>
            <tr><td>DB</td><td>{d.health.db} · תחומים מבודדים: {d.health.zonesIsolated ? "כן" : "לא (מצב הדגמה)"}</td></tr>
            <tr><td>מצב אצוות</td><td>{d.health.batchMode}</td></tr>
            <tr><td>שפות</td><td>{d.health.locales.join(", ")}</td></tr>
            <tr><td>בחירות בתצורה</td><td>{d.health.elections.join(", ") || "לא הוגדרו"}</td></tr>
            <tr><td>דגלים</td><td>{Object.entries(d.health.flags).map(([k, v]) => `${k}:${v ? "on" : "off"}`).join(" · ")}</td></tr>
            <tr><td>סודות (קיים/חסר)</td><td>{Object.entries(d.health.secrets).map(([k, v]) => `${k} ${v ? "✓" : "✗"}`).join(" · ")}</td></tr>
          </tbody></table>
        </section>
      )}
      {tab === "polls" && (
        <section>
          <p className="small">המשאלים מוגדרים בתצורה (packages/config, ADR-0022). כאן פותחים/סוגרים הצבעה. משאל חדש נוסף ב-PR לתצורה (#79).</p>
          <table><thead><tr><th>מזהה</th><th>סוג</th><th>שאלה</th><th>סטטוס</th><th>חלון 16ה</th><th></th></tr></thead>
            <tbody>{d.polls.map((p) => (<tr key={p.id}><td><code>{p.id}</code></td><td>{p.kind}</td><td>{p.question}</td><td>{p.status === "open" ? "פתוח" : "סגור"}</td><td>{p.blackout ? "פעיל" : "—"}</td>
              <td>{p.status === "open" ? <Act action="poll_close" pollId={p.id} back={back} label="סגירה" danger /> : <Act action="poll_open" pollId={p.id} back={back} label="פתיחה" />}</td></tr>))}</tbody></table>
        </section>
      )}
      {tab === "mod" && <Mod back={back} />}
      {tab === "audit" && <Audit />}
    </main>
  );
}

async function Mod({ back }: { back: string }) {
  const q = await (await stores()).content.reportedQueue();
  return (
    <section>
      <p className="small">פוסטים עם דיווחים. הרחקה חלה על מפתח הכותב בתחום C (בפוסט אנונימי: הכינוי של אותו משאל בלבד). לא חושפים זהות.</p>
      {!q.length && <p>אין דיווחים פתוחים.</p>}
      <table><tbody>{q.map((p) => (
        <tr key={p.id}><td>#{p.id}<br /><span className="small">{p.poll_id}</span></td>
          <td><b>{p.display_name}</b>{p.anon && <span className="badge2">אנונימי</span>}<div className="body">{p.body}</div>
            <span className="small">{p.report_count} דיווחים · {p.hidden ? "מוסתר" : "גלוי"}{p.deleted ? " · נמחק" : ""}{p.banned ? " · כותב מורחק" : ""}</span></td>
          <td className="acts">
            {p.hidden ? <Act action="unhide" postId={p.id} back={back} label="הצגה" /> : <Act action="hide" postId={p.id} back={back} label="הסתרה" />}
            <Act action="clear" postId={p.id} back={back} label="דחיית דיווחים" />
            {!p.deleted && <Act action="delete" postId={p.id} back={back} label="מחיקה" danger />}
            {p.banned ? <Act action="unban" postId={p.id} back={back} label="ביטול הרחקה" /> : <Act action="ban" postId={p.id} back={back} label="הרחקת כותב" danger reason />}
          </td></tr>))}</tbody></table>
    </section>
  );
}

async function Audit() {
  const rows = await (await stores()).content.auditLog();
  return (
    <section><table><thead><tr><th>מתי</th><th>מי</th><th>פעולה</th><th>יעד</th><th>פרטים</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{fmt(r.at)}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.target}</td><td>{r.detail}</td></tr>)}</tbody></table>
      {!rows.length && <p>היומן ריק.</p>}</section>
  );
}
