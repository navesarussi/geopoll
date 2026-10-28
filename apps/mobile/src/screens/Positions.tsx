import { useCallback, useEffect, useState } from "react";
import { ScrollView, Switch, TextInput, View } from "react-native";
import type { PollDef } from "@geopoll/config";
import { pollText } from "@geopoll/i18n";
import { http } from "../native/platform";
import { Button, Card, EmptyState, Notice, T, useUI } from "../components/kit";
import { radius, space, textDir } from "../theme/tokens";

type Post = { id: number; display_name: string; body: string; deleted: boolean; avatar?: string | null; parent_id: number | null };
export function PositionsScreen({ polls, signed, header }: { polls: PollDef[]; signed: boolean; header?: React.ReactNode }) {
  const { t } = useUI();
  const list = polls.filter((p) => p.publicPositions);
  return <ScrollView testID="screen-positions" contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
    {header}
    {!list.length ? <EmptyState icon="💬" title={t.m_emptyPolls} /> : list.map((p) => <Positions key={p.id} poll={p} signed={signed} />)}
  </ScrollView>;
}

function Positions({ poll, signed }: { poll: PollDef; signed: boolean }) {
  const { t, lang, dir, c } = useUI();
  const [data, setData] = useState<{ posts: Post[]; me: { defaultAnonymous: boolean; consented: boolean } | null } | null>(null);
  const [body, setBody] = useState(""); const [anon, setAnon] = useState(false); const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await http(`/api/posts?poll=${encodeURIComponent(poll.id)}`, { auth: true }).catch(() => null);
    if (r?.status === 200) { const j = r.json as typeof data; setData(j); if (j?.me) setAnon(j.me.defaultAnonymous); }
  }, [poll.id]);
  useEffect(() => { load(); }, [load]);
  const needConsent = !anon && !data?.me?.consented;
  const post = async () => {
    const r = await http("/api/posts", { method: "POST", auth: true, body: { pollId: poll.id, body, anonymous: anon, consent: needConsent ? consent : undefined } }).catch(() => null);
    const ok = r?.status === 200 && (r.json as { ok?: boolean }).ok;
    setMsg({ ok: !!ok, text: ok ? t.m_posted : t.m_postFailed });
    if (ok) { setBody(""); load(); }
  };
  return (
    <Card>
      <T v="h2" accessibilityRole="header">{pollText(poll, lang).question}</T>
      <T v="caption" color={c.muted}>{t.m_publicLabel}</T>
      {signed ? (<>
        <TextInput style={[{ borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, minHeight: 80, fontSize: 16, color: c.fg, textAlignVertical: "top" }, textDir(dir)]}
          placeholderTextColor={c.muted} multiline maxLength={500} value={body} onChangeText={setBody} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Switch value={anon} onValueChange={setAnon} trackColor={{ true: c.primary }} /><T v="body" style={{ flex: 1 }}>{anon ? t.m_postAnon : t.m_postPublic}</T></View>
        {needConsent ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Switch value={consent} onValueChange={setConsent} trackColor={{ true: c.primary }} /><T v="caption" color={c.muted} style={{ flex: 1 }}>{t.m_consent}</T></View> : null}
        <Button label={t.m_post} disabled={!body.trim() || (needConsent && !consent)} onPress={post} />
        {msg ? <Notice tone={msg.ok ? "ok" : "err"}>{msg.text}</Notice> : null}
      </>) : null}
      {data?.posts.filter((p) => !p.deleted && p.parent_id == null).map((p) => (
        <View key={p.id} style={{ borderTopWidth: 1, borderColor: c.rule, paddingTop: space.sm, gap: 2 }}>
          <T v="label" color={c.muted}>{p.avatar ?? ""} {p.display_name}</T>
          <T v="body">{p.body}</T>
        </View>))}
    </Card>);
}
