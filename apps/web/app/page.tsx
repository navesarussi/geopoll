import { getServerSession } from "next-auth";
import { authOptions, demoLoginEnabled, googleEnabled } from "@/lib/auth";
import { blackoutFor, config } from "@/lib/config";
import { pageLang, pollText } from "@/lib/i18n";
import VoteClient from "./VoteClient";
import { stores } from "@/lib/store";
import { isAdminPoll, syncPolls } from "@/lib/polls";
const shortQ = (q: string) => (q.length > 28 ? q.slice(0, 27) + "…" : q);
import { polls } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ poll?: string; lang?: string }> }) {
  const sp = await searchParams;
  const cfg = config();
  await syncPolls((await stores()).ballots).catch(() => {});
  const all = polls();
  const { lang, t, dir } = await pageLang(sp.lang);
  const poll = all.find((p) => p.id === sp.poll) ?? all[0];
  const session = await getServerSession(authOptions);
  const providers = [...(googleEnabled() ? ["google"] : []), ...(demoLoginEnabled() ? ["demo"] : [])];
  const q = (o: Record<string, string>) => "?" + new URLSearchParams({ poll: poll.id, lang, ...o }).toString();
  return (
    <div lang={lang} dir={dir}>
      {all.some((p) => blackoutFor(p).active) && <div className="election-banner" role="note">{t.electionBanner}</div>}
      <nav className="tabs" aria-label="polls">
        {all.map((p) => (
          <a key={p.id} href={q({ poll: p.id })} aria-current={p.id === poll.id ? "page" : undefined}>
            {isAdminPoll(p.id) ? shortQ(pollText(p, lang).question) : p.kind === "knesset-election" ? t.kindKnesset : t.kindReferendum}
          </a>
        ))}
        <span className="langs" aria-label={t.language}>
          {cfg.jurisdiction.locales.map((l) => <a key={l} href={q({ lang: l })} aria-current={l === lang ? "true" : undefined}>{l.toUpperCase()}</a>)}
        </span>
      </nav>
      <VoteClient key={poll.id} signedIn={!!session} providers={providers} t={t}
        poll={{ id: poll.id, kind: poll.kind, dummy: poll.dummy, ...pollText(poll, lang) }}
        kThreshold={cfg.jurisdiction.thresholds.kNational} blackout={blackoutFor(poll).active}
        relayUrl={cfg.services.relayUrl} inclusionCheck={cfg.features.inclusionCheck} lang={lang} />
    </div>
  );
}
