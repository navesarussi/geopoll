import { notFound } from "next/navigation";
import { stores } from "@/lib/store";
export const dynamic = "force-dynamic";

/** Public profile: only the user's NON-anonymous public posts. */
export default async function PublicProfile({ params }: { params: Promise<{ pid: string }> }) {
  const pid = (await params).pid;
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(pid)) notFound();
  const r = await (await stores()).content.publicProfile(pid);
  if (!r) notFound();
  return (
    <main>
      <h1>{r.profile.avatar} {r.profile.display_name}</h1>
      {r.profile.bio && <p>{r.profile.bio}</p>}
      <p className="small">עמדות ודיונים פומביים שפורסמו בשם הפרופיל. פרסומים אנונימיים לא מוצגים כאן ולא ניתנים לקישור לפרופיל.</p>
      {r.posts.length === 0 ? <p className="small">עוד אין פרסומים.</p> : r.posts.map((p) => (
        <div key={p.id} className="post"><p className="meta">{p.parent_id ? "תגובה" : "עמדה"} · {new Date(p.created_at).toLocaleDateString("he-IL")}</p><p className="body">{p.body}</p></div>
      ))}
      <p><a href="/">חזרה</a></p>
    </main>
  );
}
