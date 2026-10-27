import { useEffect, useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Switch, View } from "react-native";
import { loadConfig, type Locale } from "@geopoll/config";
import { tr } from "@geopoll/i18n";
import { loadToken } from "../core/token";
import { API_BASE, APP_VERSION, biometricAvailable, enablePush, LOCK_PREF, secureKV, unlock } from "../native/platform";
import { Button, Card, haptic, T, useUI } from "../components/kit";
import { radius, space } from "../theme/tokens";

const cfg = loadConfig("IL");
export type ThemePref = "system" | "light" | "dark";

function Segmented<V extends string>({ value, options, onChange, testID }: { value: V; options: { v: V; label: string }[]; onChange: (v: V) => void; testID?: string }) {
  const { c } = useUI();
  return <View testID={testID} accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 3 }}>
    {options.map((o) => <Pressable key={o.v} testID={`${testID}-${o.v}`} accessibilityRole="tab" accessibilityState={{ selected: value === o.v }} onPress={() => { haptic.tap(); onChange(o.v); }}
      style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: value === o.v ? c.surface : "transparent" }}>
      <T v="label" center color={value === o.v ? c.primary : c.muted}>{o.label}</T></Pressable>)}
  </View>;
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 }}><T v="body" style={{ flex: 1 }}>{label}</T>{children}</View>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useUI();
  return <View style={{ gap: space.sm }}><T v="label" color={c.muted} style={{ paddingHorizontal: space.xs }}>{title}</T><Card>{children}</Card></View>;
}

export function SettingsScreen({ lang, setLang, themePref, setThemePref, signed, onSignOut, header }: {
  lang: Locale; setLang: (l: Locale) => void; themePref: ThemePref; setThemePref: (p: ThemePref) => void; signed: boolean; onSignOut: () => void; header?: ReactNode;
}) {
  const { t, c } = useUI();
  const [bio, setBio] = useState(false); const [bioOk, setBioOk] = useState(false); const [push, setPush] = useState(false);
  const [wallet, setWallet] = useState<string>(t.m_walletEmpty);
  useEffect(() => {
    secureKV.get(LOCK_PREF).then((v) => setBio(v === "1")).catch(() => {}); biometricAvailable().then(setBioOk).catch(() => {});
    loadToken(secureKV).then((tok) => setWallet(tok ? tr(t, "m_walletHas", { epoch: tok.epoch, tier: tok.tier }) : t.m_walletEmpty)).catch(() => {});
  }, [t]);
  const langs = cfg.jurisdiction.locales.filter((l) => l === "he" || l === "en");
  return (
    <ScrollView testID="screen-settings" contentContainerStyle={{ padding: space.lg, gap: space.xl }}>
      {header}
      <Section title={t.language}>
        <Segmented testID="lang" value={lang} onChange={setLang} options={langs.map((l) => ({ v: l, label: l === "he" ? "עברית" : "English" }))} />
      </Section>
      <Section title={t.m_appearance}>
        <Segmented testID="theme" value={themePref} onChange={setThemePref} options={[{ v: "system", label: t.m_themeSystem }, { v: "light", label: t.m_themeLight }, { v: "dark", label: t.m_themeDark }]} />
      </Section>
      <Section title={t.m_security}>
        <Row label={t.m_biometricLock}><Switch disabled={!bioOk} value={bio} trackColor={{ true: c.primary }} onValueChange={async (v) => { if (await unlock(t.m_lockReason)) { await secureKV.set(LOCK_PREF, v ? "1" : "0"); setBio(v); } }} /></Row>
        <Row label={push ? t.m_notifOn : t.m_notifications}><Switch value={push} trackColor={{ true: c.primary }} onValueChange={async (v) => { if (v) setPush(!!(await enablePush())); else setPush(false); }} /></Row>
        <T v="label">{t.m_wallet}</T><T v="caption" color={c.muted}>{wallet}</T>
        <Button kind="secondary" label={t.privacy} onPress={() => Linking.openURL(`${API_BASE}/privacy`)} />
      </Section>
      <Section title={t.m_about}>
        <T v="body">{t.m_aboutBody}</T>
        <T v="caption" color={c.muted}>{t.m_noAds}</T>
        <T v="caption" color={c.muted} testID="app-version">{t.m_version} {APP_VERSION}</T>
      </Section>
      {signed ? <Section title={t.m_account}><Button kind="danger" label={t.signOut} onPress={onSignOut} /></Section> : null}
    </ScrollView>);
}
