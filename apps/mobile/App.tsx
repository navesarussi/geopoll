import "./src/native/platform"; // installs WebCrypto first
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, AppState, Image, Linking, Pressable, useColorScheme, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { loadConfig, type Locale } from "@geopoll/config";
import { DICTS, dirOf, tr } from "@geopoll/i18n";
import { checkVersion, type VersionCheck } from "./src/core/version";
import { fetchPolls, type LivePoll } from "./src/core/polls";
import { flushQueue, readQueue } from "./src/core/vote";
import { http, isOnline, isSignedIn, LOCK_PREF, onReconnect, PLATFORM, APP_VERSION, secureKV, signIn, signOut, unlock } from "./src/native/platform";
import { Button, Card, haptic, Notice, T, UICtx, useUI, type Ctx } from "./src/components/kit";
import { palettes, space, type Scheme } from "./src/theme/tokens";
import { PollsScreen } from "./src/screens/Polls";
import { ResultsScreen } from "./src/screens/Results";
import { PositionsScreen } from "./src/screens/Positions";
import { SettingsScreen, type ThemePref } from "./src/screens/Settings";

// Keep the native splash (icon) up until first real paint. Never throws; a hard timeout hides it regardless (bug-learnings #2: never hang).
SplashScreen.preventAutoHideAsync().catch(() => {});
const hideSplash = () => { SplashScreen.hideAsync().catch(() => {}); };
setTimeout(hideSplash, 8000);

const cfg = loadConfig("IL");
const RELAY = cfg.services.relayUrl;
const PREFS_KEY = "gp.prefs.v1"; // non-sensitive UI prefs only (language, theme) — never vote/choice/token data
type Tab = "polls" | "results" | "positions" | "settings";
const TAB_ICONS: Record<Tab, [string, string]> = { polls: ["checkbox", "checkbox-outline"], results: ["stats-chart", "stats-chart-outline"], positions: ["chatbubbles", "chatbubbles-outline"], settings: ["person-circle", "person-circle-outline"] };

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const sys = useColorScheme();
  const [lang, setLangState] = useState<Locale>(cfg.jurisdiction.defaultLocale);
  const [themePref, setThemeState] = useState<ThemePref>("system");
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((v) => { if (!v) return; const p = JSON.parse(v) as { lang?: Locale; theme?: ThemePref };
      if (p.lang && DICTS[p.lang]) setLangState(p.lang); if (p.theme) setThemeState(p.theme); }).catch(() => {});
  }, []);
  const save = (p: { lang: Locale; theme: ThemePref }) => { AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p)).catch(() => {}); };
  const setLang = (l: Locale) => { setLangState(l); save({ lang: l, theme: themePref }); };
  const setThemePref = (th: ThemePref) => { setThemeState(th); save({ lang, theme: th }); };
  const scheme: Scheme = themePref === "system" ? (sys === "dark" ? "dark" : "light") : themePref;
  const ctx: Ctx = useMemo(() => ({ t: DICTS[lang], lang, dir: dirOf(lang) as "rtl" | "ltr", c: palettes[scheme], scheme }), [lang, scheme]);
  return <UICtx.Provider value={ctx}><Shell setLang={setLang} themePref={themePref} setThemePref={setThemePref} /></UICtx.Provider>;
}

function Shell({ setLang, themePref, setThemePref }: { setLang: (l: Locale) => void; themePref: ThemePref; setThemePref: (p: ThemePref) => void }) {
  const { t, lang, dir, c, scheme } = useUI();
  const insets = useSafeAreaInsets();
  const [ver, setVer] = useState<VersionCheck | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [signed, setSigned] = useState(false);
  const [tab, setTab] = useState<Tab>("polls");
  const [queued, setQueued] = useState(0);
  const [polls, setPolls] = useState<LivePoll[]>([]);
  const [pollState, setPollState] = useState<"loading" | "live" | "offline" | "error">("loading");
  const reloadPolls = useCallback(() => fetchPolls(http, cfg.polls).then((r) => { setPolls(r.polls); setPollState(r.live ? "live" : "offline"); }).catch(() => setPollState("error")), []);
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
  const ready = !!ver && locked !== null;
  useEffect(() => { if (ready) hideSplash(); }, [ready]);

  const frame = { flex: 1, backgroundColor: c.bg, direction: dir, paddingTop: insets.top } as const;
  const bar = <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
  if (!ready) return <View testID="launch-loading" style={[frame, { justifyContent: "center", alignItems: "center", gap: space.lg }]}>{bar}
    <Image source={require("./assets/icon.png")} style={{ width: 96, height: 96, borderRadius: 22 }} accessibilityIgnoresInvertColors /><ActivityIndicator color={c.primary} /></View>;
  if (ver.status === "force-update") return (
    <View style={[frame, { justifyContent: "center", padding: space.xl, gap: space.lg }]}>{bar}
      <T v="h1">{t.m_forceUpdate}</T>
      {ver.storeUrl ? <Button label={t.m_openStore} onPress={() => Linking.openURL(ver.storeUrl!)} /> : null}
    </View>);
  if (locked) return (
    <View style={[frame, { justifyContent: "center", padding: space.xl, gap: space.lg, alignItems: "stretch" }]}>{bar}
      <Ionicons name="lock-closed" size={48} color={c.primary} style={{ alignSelf: "center" }} />
      <T v="h1" center>{t.m_lockTitle}</T>
      <Button label={t.m_unlock} onPress={async () => { if (await unlock(t.m_lockReason)) setLocked(false); }} />
    </View>);

  const header = (title: string) => (
    <View style={{ gap: space.md }}>
      <T v="title" accessibilityRole="header">{title}</T>
      {ver.status === "update-available" ? <Pressable onPress={() => ver.storeUrl && Linking.openURL(ver.storeUrl)}><Notice tone="info">{`${t.m_updateAvailable} ${ver.storeUrl ? t.m_openStore : ""}`}</Notice></Pressable> : null}
      {queued > 0 ? <Notice><View style={{ gap: space.sm }}><T v="caption" color={c.warnFg}>{tr(t, "m_queuedCount", { n: queued })}</T><Button kind="secondary" label={t.m_sendNow} onPress={flush} /></View></Notice> : null}
      {!signed && tab !== "settings" ? <Card><Button testID="sign-in" label={t.signInGoogle} onPress={async () => { (await signIn().catch(() => false)) ? (haptic.success(), setSigned(true)) : haptic.error(); }} /><T v="caption" color={c.muted} center>{t.m_noAds}</T></Card> : null}
    </View>);
  const labels: Record<Tab, string> = { polls: t.m_polls, results: t.m_results, positions: t.m_positions, settings: t.m_settings };
  return (
    <View style={frame}>{bar}
      <View style={{ backgroundColor: c.betaBg, paddingVertical: 4 }}><T v="caption" color={c.betaFg} center>{t.beta}</T></View>
      <View style={{ flex: 1 }}>
        {tab === "polls" && <PollsScreen header={header(labels.polls)} polls={polls} state={pollState} signed={signed} onRefresh={reloadPolls} onQueued={refreshQueue} />}
        {tab === "results" && <ResultsScreen header={header(labels.results)} polls={polls} />}
        {tab === "positions" && <PositionsScreen header={header(labels.positions)} polls={polls} signed={signed} />}
        {tab === "settings" && <SettingsScreen header={header(labels.settings)} lang={lang} setLang={setLang} themePref={themePref} setThemePref={setThemePref} signed={signed}
          onSignOut={async () => { await signOut(); setSigned(false); }} />}
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", borderTopWidth: 1, borderColor: c.rule, backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, space.sm), paddingTop: space.sm }}>
        {(Object.keys(labels) as Tab[]).map((k) => {
          const on = tab === k;
          return <Pressable key={k} testID={`tab-${k}`} accessibilityRole="tab" accessibilityLabel={labels[k]} accessibilityState={{ selected: on }} onPress={() => { if (!on) haptic.tap(); setTab(k); }}
            style={{ flex: 1, alignItems: "center", gap: 2, minHeight: 44, justifyContent: "center" }}>
            <Ionicons name={TAB_ICONS[k][on ? 0 : 1] as never} size={24} color={on ? c.primary : c.muted} />
            <T v="caption" center color={on ? c.primary : c.muted} style={{ fontWeight: on ? "700" : "500", fontSize: 11 }}>{labels[k]}</T>
          </Pressable>;
        })}
      </View>
    </View>);
}
