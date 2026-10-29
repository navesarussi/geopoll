import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { loadConfig } from "@geopoll/config";
import { pollText, tr } from "@geopoll/i18n";
import { resultsState, type LivePoll } from "../core/polls";
import { chartRows, isBasicAssurance } from "../core/ui-logic";
import { http } from "../native/platform";
import { BarChart, Card, Chip, EmptyState, Notice, Skeleton, T, useUI } from "../components/kit";
import { space } from "../theme/tokens";

const cfg = loadConfig("IL");
type Results = { published: boolean; blackout?: boolean; participants?: string; percents?: Record<string, number>; snapshotAt?: string; assurance?: "basic" | "verified" };

export function ResultsScreen({ polls, header }: { polls: LivePoll[]; header?: React.ReactNode }) {
  const { t, c } = useUI();
  const [gen, setGen] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView testID="screen-results" contentContainerStyle={{ padding: space.lg, gap: space.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.primary} onRefresh={() => { setRefreshing(true); setGen((g) => g + 1); setTimeout(() => setRefreshing(false), 600); }} />}>
      {header}
      {!polls.length ? <EmptyState icon="📊" title={t.m_emptyPolls} /> : polls.map((p) => <ResultCard key={p.id} poll={p} gen={gen} />)}
      <T v="caption" color={c.muted}>{t.resultsNote}</T>
    </ScrollView>);
}

function ResultCard({ poll, gen }: { poll: LivePoll; gen: number }) {
  const { t, lang, c } = useUI();
  const pt = pollText(poll, lang);
  const [res, setRes] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { setFailed(false); http(`/api/results?poll=${encodeURIComponent(poll.id)}`).then((r) => setRes(r.json as Results)).catch(() => setFailed(true)); }, [poll.id]);
  useEffect(() => { load(); }, [load, gen]);
  const st = resultsState(res); // blackout wins over everything (§16ה) — bug-learnings 2026-10-27
  return (
    <Card testID={`results-${poll.id}`}>
      <T v="h2" accessibilityRole="header">{pt.question}</T>
      {failed && !res ? <Notice tone="err">{t.m_loadError}</Notice>
        : st === "loading" ? <View style={{ gap: space.md }}><Skeleton h={12} /><Skeleton h={12} w="70%" /><Skeleton h={12} w="40%" /></View>
        : st === "blackout" ? <Notice testID="results-blackout">{t.blackout}</Notice>
        : st === "belowK" ? <Notice tone="info" testID="results-belowk">{tr(t, "belowK", { k: cfg.jurisdiction.thresholds.kNational })}</Notice>
        : (<>
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
            <Chip label={`${t.participants}: ${res!.participants ?? "—"}`} tone="muted" />
            {isBasicAssurance(res) ? <Chip label={t.m_assuranceBasic} tone="warn" /> : null}
          </View>
          <BarChart rows={chartRows(pt.options, res!.percents)} leadingLabel={t.m_leading} />
          {isBasicAssurance(res) ? <T v="caption" color={c.muted} testID="results-basic-assurance">{t.basicAssurance.trim()}</T> : null}
          {poll.kind !== "referendum" ? <T v="caption" color={c.muted}>{t.electionLabel}</T> : null}
          {res!.snapshotAt ? <T v="caption" color={c.muted}>{t.results} · {new Date(res!.snapshotAt).toLocaleString(lang)}</T> : null}
        </>)}
    </Card>);
}
