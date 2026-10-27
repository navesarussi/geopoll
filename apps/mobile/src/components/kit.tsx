import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import type { Locale } from "@geopoll/config";
import type { Dict } from "@geopoll/i18n";
import { MAX_FONT_SCALE, palettes, radius, space, textDir, type, type Palette, type Scheme } from "../theme/tokens";
import type { ChipTone } from "../core/ui-logic";

export type Ctx = { t: Dict; lang: Locale; dir: "rtl" | "ltr"; c: Palette; scheme: Scheme };
export const UICtx = createContext<Ctx | null>(null);
export const useUI = () => { const v = useContext(UICtx); if (!v) throw new Error("UICtx missing"); return v; };
export const fallbackPalette = palettes.light;

/** Haptics never throw (simulator / unsupported devices). */
export const haptic = {
  tap: () => { Haptics.selectionAsync().catch(() => {}); },
  success: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  error: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};

type Variant = keyof typeof type;
export function T({ v = "body", color, style, children, center, ...rest }: { v?: Variant; color?: string; style?: TextStyle | TextStyle[]; children: ReactNode; center?: boolean; testID?: string; accessibilityRole?: "header" | "text"; accessibilityLiveRegion?: "polite" }) {
  const { c, dir } = useUI();
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[type[v] as TextStyle, { color: color ?? c.fg }, center ? { textAlign: "center" } : textDir(dir), style as TextStyle]} {...rest}>{children}</Text>;
}

export function Card({ children, style, testID }: { children: ReactNode; style?: ViewStyle; testID?: string }) {
  const { c } = useUI();
  return <View testID={testID} style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: c.rule,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, style]}>{children}</View>;
}

export function Button({ label, onPress, disabled, kind = "primary", busy, testID }: { label: string; onPress: () => void; disabled?: boolean; kind?: "primary" | "secondary" | "danger"; busy?: boolean; testID?: string }) {
  const { c } = useUI();
  const bg = kind === "primary" ? c.primary : "transparent";
  const fg = kind === "primary" ? c.primaryFg : kind === "danger" ? c.err : c.primary;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy} onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: radius.md, minHeight: 48, paddingHorizontal: space.lg, alignItems: "center", justifyContent: "center",
        borderWidth: kind === "primary" ? 0 : 1, borderColor: kind === "danger" ? c.err : c.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <T v="label" color={fg} center>{label}</T>}
    </Pressable>);
}

export function Chip({ label, tone }: { label: string; tone: ChipTone }) {
  const { c } = useUI();
  const [fg, bg] = tone === "ok" ? [c.ok, c.okBg] : tone === "err" ? [c.err, c.errBg] : tone === "warn" ? [c.warnFg, c.warnBg] : [c.muted, c.surfaceAlt];
  return <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}><T v="caption" color={fg} style={{ fontWeight: "700" }}>{label}</T></View>;
}

export function Notice({ tone = "warn", children, testID }: { tone?: "warn" | "err" | "ok" | "info"; children: ReactNode; testID?: string }) {
  const { c } = useUI();
  const [fg, bg, bd] = tone === "err" ? [c.err, c.errBg, c.err] : tone === "ok" ? [c.ok, c.okBg, c.ok] : tone === "info" ? [c.fg, c.primarySoft, c.primarySoft] : [c.warnFg, c.warnBg, c.warnBorder];
  return <View testID={testID} accessibilityLiveRegion="polite" style={{ backgroundColor: bg, borderColor: bd, borderWidth: 1, borderRadius: radius.md, padding: space.md }}>
    {typeof children === "string" ? <T v="caption" color={fg}>{children}</T> : children}</View>;
}

/** Pulsing placeholder block for loading skeletons. */
export function Skeleton({ h = 14, w = "100%", r = radius.sm }: { h?: number; w?: number | `${number}%`; r?: number }) {
  const { c } = useUI();
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, [o]);
  return <Animated.View style={{ height: h, width: w, borderRadius: r, backgroundColor: c.skeleton, opacity: o }} />;
}
export function CardSkeleton({ testID }: { testID?: string }) {
  return <Card testID={testID}><Skeleton w={90} h={20} r={radius.pill} /><Skeleton h={22} w="80%" /><Skeleton h={48} r={radius.md} /><Skeleton h={48} r={radius.md} /></Card>;
}

export function EmptyState({ icon, title, action }: { icon: string; title: string; action?: { label: string; onPress: () => void } }) {
  return <View style={{ alignItems: "center", paddingVertical: space.xxl, gap: space.md }}>
    <T v="title" center>{icon}</T><T v="body" center>{title}</T>
    {action ? <Button kind="secondary" label={action.label} onPress={action.onPress} /> : null}
  </View>;
}

/** Horizontal bar chart. Rows come pre-filtered from chartRows(); nothing is shown that the API didn't publish. */
export function BarChart({ rows, leadingLabel }: { rows: { id: string; text: string; pct: number; leader: boolean }[]; leadingLabel: string }) {
  const { c } = useUI();
  return <View style={{ gap: space.md }} accessibilityRole="summary">
    {rows.map((r, i) => (
      <View key={r.id} accessible accessibilityLabel={`${r.text} ${r.pct}%`} style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm }}>
          <T v="label" style={{ flexShrink: 1 }}>{r.text}{r.leader ? `  · ${leadingLabel}` : ""}</T>
          <T v="label" color={c.chart[i % c.chart.length]}>{r.pct}%</T>
        </View>
        <View style={{ height: 12, backgroundColor: c.track, borderRadius: radius.pill, overflow: "hidden" }}>
          <View style={{ height: 12, width: `${r.pct}%`, backgroundColor: c.chart[i % c.chart.length], borderRadius: radius.pill }} />
        </View>
      </View>))}
  </View>;
}
