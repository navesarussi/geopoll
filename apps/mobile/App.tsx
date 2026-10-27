import "./src/native/platform"; // installs WebCrypto first
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { loadConfig, type Locale, type PollDef } from "@geopoll/config";
import { DICTS, dirOf, pollText, tr, type Dict } from "@geopoll/i18n";
import { checkVersion, type VersionCheck } from "./src/core/version";
import { deviceNullifier, getOrIssueToken, loadToken, TOKEN_KEY, TokenError } from "./src/core/token";
import { fetchPolls, resultsState, type LivePoll } from "./src/core/polls";
import { castOrQueue, CHOICE_KEY, flushQueue, readQueue } from "./src/core/vote";
import { API_BASE, APP_VERSION, biometricAvailable, enablePush, http, isOnline, isSignedIn, LOCK_PREF, onReconnect, PLATFORM, secureKV, signIn, signOut, unlock } from "./src/native/platform";
import { s } from "./src/ui";

const cfg = loadConfig("IL");
const RELAY = cfg.services.relayUrl; // "/api/relay": strips cookies/IP headers before Zone B
type Tab = "polls" | "positions" | "settings";
type Ctx = { t: Dict; lang: Locale; dir: "rtl" | "ltr" };

function Btn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[s.btn, disabled && { opacity: 0.5 }]}><Text style={s.btnText}>{label}</Text></Pressable>;
}

export default function App() {
  const [lang, setLang] = useState<Locale>(cfg.jurisdiction.defaultLocale);
  const t = DICTS[lang], dir = dirOf(lang) as "rtl" | "ltr";
  const [ver, setVer] = useState<VersionCheck | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [signed, setSigned] = useState(false);
  const [tab, setTab] = useState<Tab>("polls");
  const [queued, setQueued] = useState(0);
  const [polls, setPolls] = useState<LivePoll[]>(() => cfg.polls.map((p) => ({ ...p, status: "open", blackout: false })));
  const reloadPolls = useCallback(() => fetchPolls(http, cfg.polls).then((r) => setPolls(r.polls)).catch(() => {}), []);
  useEffect(() => { reloadPolls(); }, [reloadPolls]);

  const refreshQueue = useCallback(async () => setQueued((await readQueue(secureKV)).length), []);
  const flush = useCallback(async () => { if (await isOnline()) { await flushQueue(secureKV, http, RELAY).catch(() => {}); } await refreshQueue(); }, [refreshQueue]);

  useEffect(() => {
    // Never hang on the launch spinner (bug-learnings #2): version check times out open, secure-store errors default to unlocked.
    const timeout = new Promise<VersionCheck>((r) => setTimeout(() => r({ status: "ok", storeUrl: null }), 6000));
    Promise.race([checkVersion(http, APP_VERSION, PLATFORM), timeout]).then(setVer);
    (async () => {
      try { setLocked((await secureKV.get(LOCK_PREF)) === "1"); } catch (e) { console.warn("lock pref unavailable", e); setLocked(false); }
      try { setSigned(await isSignedIn()); await flush(); } catch (e) { console.warn("startup", e); }
    })();
    const un = onReconnect(flush);
    const sub = AppState.addEventListener("change", async (st) => { if (st === "background" && (await secureKV.get(LOCK_PREF)) === "1") setLocked(true); });
    return () => { un(); sub.remove(); };
  }, [flush]);

  const ctx: Ctx = { t, lang, dir };
  const text = { writingDirection: dir, textAlign: dir === "rtl" ? "right" : "left" } as const;

  if (!ver || locked === null) return <SafeAreaView testID="launch-loading" style={[s.root, { justifyContent: "center" }]}><ActivityIndicator /></SafeAreaView>;
  if (ver.status === "force-update") return (
    <SafeAreaView style={[s.root, s.pad, { justifyContent: "center", direction: dir }]}>
      <Text style={[s.h1, text]}>{t.m_forceUpdate}</Text>
      {ver.storeUrl ? <Btn label={t.m_openStore} onPress={() => Linking.openURL(ver.storeUrl!)} /> : null}
    </SafeAreaView>);
  if (locked) return (
    <SafeAreaView style={[s.root, s.pad, { justifyContent: "center", direction: dir }]}>
      <Text style={[s.h1, text]}>{t.m_lockTitle}</Text>
      <Btn label={t.m_unlock} onPress={async () => { if (await unlock(t.m_lockReason)) setLocked(false); }} />
    </SafeAreaView>);

  return (
    <SafeAreaView style={[s.root, { direction: dir }]}>
      <StatusBar style="dark" />
      <View style={s.beta}><Text style={s.betaText}>{t.beta}</Text></View>
      {ver.status === "update-available" ? <Pressable style={s.warn} onPress={() => ver.storeUrl && Linking.openURL(ver.storeUrl)}><Text style={text}>{t.m_updateAvailable} {ver.storeUrl ? t.m_openStore : ""}</Text></Pressable> : null}
      {queued > 0 ? <View style={s.warn}><Text style={text}>{tr(t, "m_queuedCount", { n: queued })}</Text><Pressable onPress={flush}><Text style={[s.ok, text]}>{t.m_sendNow}</Text></Pressable></View> : null}
      <ScrollView contentContainerStyle={s.pad}>
        {!signed && tab !== "settings" ? <SignIn ctx={ctx} onDone={() => setSigned(true)} /> : null}
        {tab === "polls" && polls.some((p) => p.blackout) ? <View style={s.warn}><Text style={text}>{t.electionBanner}</Text></View> : null}
        {tab === "polls" && polls.map((p) => <PollCard key={p.id} poll={p} ctx={ctx} signed={signed} onQueued={refreshQueue} />)}
        {tab === "positions" && polls.filter((p) => p.publicPositions).map((p) => <Positions key={p.id} poll={p} ctx={ctx} signed={signed} />)}
        {tab === "settings" && <Settings ctx={ctx} setLang={setLang} signed={signed} onSignOut={async () => { await signOut(); setSigned(false); }} />}
      </ScrollView>
      <View style={s.tabs}>
        {(["polls", "positions", "settings"] as Tab[]).map((k) => (
          <Pressable key={k} testID={`tab-${k}`} style={s.tab} onPress={() => setTab(k)} accessibilityState={{ selected: tab === k }}>
            <Text style={tab === k ? s.ok : s.muted}>{k === "polls" ? t.m_polls : k === "positions" ? t.m_positions : t.m_settings}</Text>
          </Pressable>))}
      </View>
    </SafeAreaView>
  );
}

function SignIn({ ctx: { t }, onDone }: { ctx: Ctx; onDone: () => void }) {
  const [err, setErr] = useState(false);
  return (
    <View style={s.card}>
      <Btn label={t.signInGoogle} onPress={async () => { setErr(false); (await signIn().catch(() => false)) ? onDone() : setErr(true); }} />
      {err ? <Text style={s.err}>{t.m_signInFailed}</Text> : null}
      <Text style={s.muted}>{t.m_noAds}</Text>
    </View>);
}

type Results = { published: boolean; blackout?: boolean; participants?: string; percents?: Record<string, number>; snapshotAt?: string };
function PollCard({ poll, ctx: { t, lang, dir }, signed, onQueued }: { poll: LivePoll; ctx: Ctx; signed: boolean; onQueued: () => void }) {
  const pt = pollText(poll, lang);
  const text = { writingDirection: dir, textAlign: dir === "rtl" ? "right" : "left" } as const;
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [res, setRes] = useState<Results | null>(null);
  const [inc, setInc] = useState<string | null>(null);
  const canVote = signed && poll.status === "open" && !(poll.blackout && poll.kind !== "referendum");
  const load = useCallback(() => http(`/api/results?poll=${encodeURIComponent(poll.id)}`).then((r) => setRes(r.json as Results)).catch(() => {}), [poll.id]);
  useEffect(() => { load(); secureKV.get(CHOICE_KEY(poll.id)).then(setChoice); }, [load, poll.id]);

  const vote = async (option: string) => {
    setBusy(true); setMsg(null);
    try {
      const online = await isOnline();
      const tok = online ? await getOrIssueToken(secureKV, http) : await loadToken(secureKV);
      if (!tok) throw new TokenError("offline_no_token");
      const out = await castOrQueue(secureKV, http, RELAY, poll.id, option, tok, online);
      if (out.kind === "error") {
        if (out.dropToken) await secureKV.del(TOKEN_KEY);
        setMsg({ ok: false, text: (t as Record<string, string>)[`err_${out.code}`] ?? t.voteFailed });
      } else {
        setChoice(option);
        setMsg({ ok: true, text: out.kind === "queued" ? t.m_offlineQueued : out.kind === "replaced" ? t.voteReplaced : t.voteCreated });
        if (out.kind === "queued") onQueued();
      }
    } catch (e) {
      const code = e instanceof TokenError ? e.message : "";
      setMsg({ ok: false, text: (t as Record<string, string>)[`err_${code}`] ?? t.voteFailed });
    } finally { setBusy(false); }
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
    <View style={s.card}>
      <Text style={[s.muted, text]}>{poll.kind === "referendum" ? t.kindReferendum : t.kindKnesset} · {t.secretBallot}{poll.dummy ? ` · ${t.dummyBadge}` : ""}</Text>
      <Text style={[s.h2, text]}>{pt.question}</Text>
      <Text style={[s.muted, text]}>{t.secretExplainer}</Text>
      {poll.status !== "open" ? <Text style={[s.err, text]}>{poll.status === "scheduled" ? t.m_pollScheduled : t.err_closed}</Text> : null}
      {poll.blackout && poll.kind !== "referendum" ? <Text style={[s.err, text]}>{t.err_blackout}</Text> : null}
      {pt.options.map((o) => (
        <Pressable key={o.id} disabled={!canVote || busy} onPress={() => vote(o.id)} style={[s.opt, choice === o.id && s.optOn, !canVote && { opacity: 0.5 }]} accessibilityRole="button">
          <Text style={[s.body, text]}>{o.text}{choice === o.id ? " ✓" : ""}</Text>
        </Pressable>))}
      {busy ? <ActivityIndicator /> : null}
      {msg ? <Text accessibilityLiveRegion="polite" style={[msg.ok ? s.ok : s.err, text]}>{msg.text}</Text> : null}
      {cfg.features.inclusionCheck && choice ? <Pressable onPress={check}><Text style={[s.ok, text]}>{t.checkInclusion}</Text></Pressable> : null}
      {inc ? <Text style={[s.body, text]}>{inc}</Text> : null}
      {inc ? <Text style={[s.muted, text]}>{t.incNote}</Text> : null}
      <Text style={[s.h2, text]}>{t.results}</Text>
      {resultsState(res) === "loading" ? <Text style={s.muted}>{t.loading}</Text> : resultsState(res) === "blackout" ? <Text style={[s.muted, text]}>{t.blackout}</Text> : resultsState(res) === "belowK" || !res ? <Text style={[s.muted, text]}>{tr(t, "belowK", { k: cfg.jurisdiction.thresholds.kNational })}</Text> : (
        <View style={{ gap: 6 }}>
          <Text style={[s.muted, text]}>{t.participants}: {res.participants}</Text>
          {pt.options.filter((o) => res.percents?.[o.id] != null).map((o) => (
            <View key={o.id}><Text style={text}>{o.text} · {res.percents![o.id]}%</Text>
              <View style={s.bar}><View style={[s.fill, { width: `${res.percents![o.id]}%` }]} /></View></View>))}
          <Text style={[s.muted, text]}>{t.resultsNote}{poll.kind !== "referendum" ? ` ${t.electionLabel}` : ""}</Text>
        </View>)}
      <Pressable onPress={load}><Text style={[s.muted, text]}>{t.refresh}</Text></Pressable>
    </View>);
}

type Post = { id: number; display_name: string; body: string; deleted: boolean; avatar?: string | null; parent_id: number | null };
function Positions({ poll, ctx: { t, lang, dir }, signed }: { poll: PollDef; ctx: Ctx; signed: boolean }) {
  const text = { writingDirection: dir, textAlign: dir === "rtl" ? "right" : "left" } as const;
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
    <View style={s.card}>
      <Text style={[s.h2, text]}>{pollText(poll, lang).question}</Text>
      <Text style={[s.muted, text]}>{t.m_publicLabel}</Text>
      {signed ? (<>
        <TextInput style={[s.input, text]} multiline maxLength={500} value={body} onChangeText={setBody} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Switch value={anon} onValueChange={setAnon} /><Text style={[s.body, { flex: 1 }, text]}>{anon ? t.m_postAnon : t.m_postPublic}</Text></View>
        {needConsent ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Switch value={consent} onValueChange={setConsent} /><Text style={[s.muted, { flex: 1 }, text]}>{t.m_consent}</Text></View> : null}
        <Btn label={t.m_post} disabled={!body.trim() || (needConsent && !consent)} onPress={post} />
        {msg ? <Text style={[msg.ok ? s.ok : s.err, text]}>{msg.text}</Text> : null}
      </>) : null}
      {data?.posts.filter((p) => !p.deleted && p.parent_id == null).map((p) => (
        <View key={p.id} style={{ borderTopWidth: 1, borderColor: "#e1e6ef", paddingTop: 8 }}>
          <Text style={[s.muted, text]}>{p.avatar ?? ""} {p.display_name}</Text>
          <Text style={[s.body, text]}>{p.body}</Text>
        </View>))}
    </View>);
}

function Settings({ ctx: { t, dir }, setLang, signed, onSignOut }: { ctx: Ctx; setLang: (l: Locale) => void; signed: boolean; onSignOut: () => void }) {
  const text = { writingDirection: dir, textAlign: dir === "rtl" ? "right" : "left" } as const;
  const [bio, setBio] = useState(false); const [bioOk, setBioOk] = useState(false); const [push, setPush] = useState(false);
  const [wallet, setWallet] = useState<string>(t.m_walletEmpty);
  useEffect(() => {
    secureKV.get(LOCK_PREF).then((v) => setBio(v === "1")); biometricAvailable().then(setBioOk);
    loadToken(secureKV).then((tok) => setWallet(tok ? tr(t, "m_walletHas", { epoch: tok.epoch, tier: tok.tier }) : t.m_walletEmpty));
  }, [t]);
  return (
    <View style={s.card}>
      <Text style={[s.h2, text]}>{t.language}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {cfg.jurisdiction.locales.filter((l) => l === "he" || l === "en").map((l) => <Pressable key={l} style={s.opt} onPress={() => setLang(l)}><Text>{l === "he" ? "עברית" : "English"}</Text></Pressable>)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Switch disabled={!bioOk} value={bio} onValueChange={async (v) => { if (await unlock(t.m_lockReason)) { await secureKV.set(LOCK_PREF, v ? "1" : "0"); setBio(v); } }} />
        <Text style={[s.body, text]}>{t.m_biometricLock}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Switch value={push} onValueChange={async (v) => { if (v) setPush(!!(await enablePush())); else setPush(false); }} />
        <Text style={[s.body, text]}>{push ? t.m_notifOn : t.m_notifications}</Text>
      </View>
      <Text style={[s.h2, text]}>{t.m_wallet}</Text>
      <Text style={[s.muted, text]}>{wallet}</Text>
      <Pressable onPress={() => Linking.openURL(`${API_BASE}/privacy`)}><Text style={[s.ok, text]}>{t.privacy}</Text></Pressable>
      {signed ? <Pressable onPress={onSignOut}><Text style={[s.err, text]}>{t.signOut}</Text></Pressable> : null}
      <Text style={[s.muted, text]}>{t.m_noAds} v{APP_VERSION}</Text>
    </View>);
}
