import { tokens } from "@geopoll/design-tokens";
import { StyleSheet } from "react-native";
const px = (s: string) => parseFloat(s);
export const c = tokens.color;
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  pad: { padding: px(tokens.space.lg), gap: px(tokens.space.md) },
  card: { backgroundColor: c.surface, borderRadius: px(tokens.radius.lg), padding: px(tokens.space.lg), borderWidth: 1, borderColor: c.rule, gap: px(tokens.space.sm) },
  h1: { fontSize: 22, fontWeight: "700", color: c.fg },
  h2: { fontSize: 17, fontWeight: "600", color: c.fg },
  body: { fontSize: 16, color: c.fg },
  muted: { fontSize: 13, color: c.muted },
  btn: { backgroundColor: c.primary, borderRadius: px(tokens.radius.md), paddingVertical: 14, alignItems: "center" },
  btnText: { color: c.primaryFg, fontSize: 16, fontWeight: "600" },
  opt: { borderWidth: 1, borderColor: c.border, borderRadius: px(tokens.radius.md), padding: 14 },
  optOn: { borderColor: c.primary, backgroundColor: c.infoBg },
  ok: { color: c.ok, fontWeight: "600" },
  err: { color: c.err, fontWeight: "600" },
  beta: { backgroundColor: c.betaBg, padding: 6 },
  betaText: { color: c.betaFg, fontSize: 12, textAlign: "center" },
  warn: { backgroundColor: c.warnBg, borderColor: c.warnBorder, borderWidth: 1, borderRadius: 8, padding: 10 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: c.rule, backgroundColor: c.surface },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  bar: { height: 10, backgroundColor: c.track, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, backgroundColor: c.primary },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10, minHeight: 70, fontSize: 16, textAlignVertical: "top" },
});
