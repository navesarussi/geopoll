import { notFound } from "next/navigation";
import { stores } from "@/lib/store";
import { pageLang } from "@/lib/i18n";
export const dynamic = "force-dynamic";

/** Public profile: only the user's NON-anonymous public posts. */
export default async function PublicProfile({ params, searchParams }: { params: Promise<{ pid: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { lang, t, dir } = await pageLang((await searchParams).lang);
  const pid = (await params).pid;
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(pid)) notFound();
  const r = await (await stores()).content.publicProfile(pid);
  if (!r) notFound();
  return (
    <main lang={lang} dir={dir}>
      <h1>{r.profile.avatar} {r.profile.display_name}</h1>
      {r.profile.bio && <p>{r.profile.bio}</p>}
      <p className="small">{t.pu_intro}</p>
      {r.posts.length === 0 ? <p className="small">{t.pu_none}</p> : r.posts.map((p) => (
        <div key={p.id} className="post"><p className="meta">{p.parent_id ? t.pu_reply : t.pu_position} · {new Date(p.created_at).toLocaleDateString(lang)}</p><p className="body">{p.body}</p></div>
      ))}
      <p><a href={`/?lang=${lang}`}>{t.back}</a></p>
    </main>
  );
}
