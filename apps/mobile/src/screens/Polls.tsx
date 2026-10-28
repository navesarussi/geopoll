import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { loadConfig } from "@geopoll/config";
import { pollText, tr } from "@geopoll/i18n";
import { deviceNullifier, getOrIssueToken, loadToken, TOKEN_KEY, TokenError } from "../core/token";
import type { LivePoll } from "../core/polls";
import { castOrQueue, CHOICE_KEY } from "../core/vote";
import { canVote as canVoteFn, pollChip } from "../core/ui-logic";
import { http, isOnline, secureKV } from "../native/platform";
import { Button, Card, CardSkeleton, Chip, EmptyState, haptic, Notice, T, useUI } from "../components/kit";
import { radius, space } from "../theme/tokens";

const cfg = loadConfig("IL");
const RELAY = cfg.services.relayUrl; // "/api/relay": strips cookies/IP headers before Zone B

export function PollsScreen({ polls, state, signed, onRefresh, onQueued, header }: {
  polls: LivePoll[]; state: "loading" | "live" | "offline" | "error"; signed: boolean; onRefresh: () => Promise<unknown>; onQueued: () => void; header?: React.ReactNode;
}) {
  const { t, c } = useUI();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => { setRefreshing(true); await onRefresh().catch(() => {}); setRefreshing(false); };
  return (
    <ScrollView testID="screen-polls" contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
      {header}
      {polls.some((p) => p.blackout) ? <Notice testID="election-banner">{t.electionBanner}</Notice> : null}
      {state === "offline" ? <Notice tone="info">{t.m_offlineCached}</Notice> : null}
      {state === "loading" ? <><CardSkeleton testID="polls-skeleton" /><CardSkeleton /></>
        : state === "error" && !polls.length ? <EmptyState icon="⚠️" title={t.m_loadError} action={{ label: t.retry, onPress: refresh }} />
        : !polls.length ? <EmptyState icon="🗳️" title={t.m_emptyPolls} />
        : polls.map((p) => <PollCard key={p.id} poll={p} signed={signed} onQueued={onQueued} />)}
    </ScrollView>);
}

function PollCard({ poll, signed, onQueued }: { poll: LivePoll; signed: boolean; onQueued: () => void }) {
  const { t, lang, c } = useUI();
  const pt = pollText(poll, lang);
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [inc, setInc] = useState<string | null>(null);
  const can = canVoteFn(poll, signed);
  const chip = pollChip(poll);
  useEffect(() => { secureKV.get(CHOICE_KEY(poll.id)).then(setChoice).catch(() => {}); }, [poll.id]);

  const vote = useCallback(async (option: string) => {
    setBusy(true); setMsg(null);
    try {
      const online = await isOnline();
      const tok = online ? await getOrIssueToken(secureKV, http) : await loadToken(secureKV);
      if (!tok) throw new TokenError("offline_no_token");
      const out = await castOrQueue(secureKV, http, RELAY, poll.id, option, tok, online);
      if (out.kind === "error") {
        if (out.dropToken) await secureKV.del(TOKEN_KEY);
        haptic.error(); setMsg({ ok: false, text: (t as Record<string, string>)[`err_${out.code}`] ?? t.voteFailed });
      } else {
        setChoice(option); haptic.success();
        setMsg({ ok: true, text: out.kind === "queued" ? t.m_offlineQueued : out.kind === "replaced" ? t.voteReplaced : t.voteCreated });
        if (out.kind === "queued") onQueued();
      }
    } catch (e) {
      const code = e instanceof TokenError ? e.message : "";
      haptic.error(); setMsg({ ok: false, text: (t as Record<string, string>)[`err_${code}`] ?? t.voteFailed });
    } finally { setBusy(false); }
  }, [poll.id, t, onQueued]);

  const confirm = (id: string, label: string) => {
    haptic.tap();
    Alert.alert(t.m_confirmTitle, tr(t, "m_confirmBody", { choice: label }), [
      { text: t.m_cancel, style: "cancel" },
      { text: t.m_confirm, onPress: () => { vote(id); } },
    ]);
  };
  const check = async () => {
    setInc(t.incChecking);
    try {
      const tok = await loadToken(secureKV);
      if (!tok) return setInc(t.incNoToken);
      const r = await http(`${RELAY}/vote-status`, { method: "POST", auth: false, body: { nullifier: await deviceNullifier(poll.id, tok.preparedMsg) } });
      const st = (r.json as { status?: string }).status;
      setInc(st === "counted" ? t.incCounted : st === "queued" ? t.incQueued : t.incNone);
    } catch { setInc(t.incFailed); }
  };

  return (
    <Card testID={`poll-${poll.id}`}>
      <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap", alignItems: "center" }}>
        <Chip label={(t as Record<string, string>)[chip.key]} tone={chip.tone} />
        <Chip label={poll.kind === "referendum" ? t.kindReferendum : t.kindKnesset} tone="muted" />
        {poll.dummy ? <Chip label={t.dummyBadge} tone="warn" /> : null}
      </View>
      <T v="h1" accessibilityRole="header">{pt.question}</T>
      <T v="caption" color={c.muted}>🔒 {t.secretBallot} · {t.secretExplainer}</T>
      {poll.status !== "open" ? <Notice tone="err">{poll.status === "scheduled" ? t.m_pollScheduled : t.err_closed}</Notice> : null}
      {poll.blackout && poll.kind !== "referendum" ? <Notice>{t.err_blackout}</Notice> : null}
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {pt.options.map((o) => {
          const on = choice === o.id;
          return (
            <Pressable key={o.id} testID={`opt-${poll.id}-${o.id}`} disabled={!can || busy} onPress={() => confirm(o.id, o.text)}
              accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !can || busy }} accessibilityLabel={o.text}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52, paddingHorizontal: space.lg, borderRadius: radius.md,
                borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : pressed ? c.surfaceAlt : c.surface, opacity: can ? 1 : 0.5 }]}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? c.primary : c.border, alignItems: "center", justifyContent: "center" }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
              </View>
              <T v="body" style={{ flex: 1, fontWeight: on ? "700" : "400" }}>{o.text}</T>
            </Pressable>);
        })}
      </View>
      {busy ? <T v="caption" color={c.muted}>{t.sending}</T> : null}
      {msg ? <Notice tone={msg.ok ? "ok" : "err"} testID="vote-feedback">{msg.text}</Notice> : null}
      {cfg.features.inclusionCheck && choice ? <Button kind="secondary" label={t.checkInclusion} onPress={check} /> : null}
      {inc ? <T v="body">{inc}</T> : null}
      {inc ? <T v="caption" color={c.muted}>{t.incNote}</T> : null}
    </Card>);
}
