/** Mobile design system (brand = temp icon blue→teal). Pure data + helpers so it is unit-testable without React Native. */
export type Scheme = "light" | "dark";
export type Palette = {
  bg: string; surface: string; surfaceAlt: string; fg: string; muted: string; border: string; rule: string;
  primary: string; primaryFg: string; accent: string; primarySoft: string; track: string;
  ok: string; okBg: string; err: string; errBg: string; warnFg: string; warnBg: string; warnBorder: string;
  betaBg: string; betaFg: string; skeleton: string; chart: string[];
};
export const palettes: Record<Scheme, Palette> = {
  light: {
    bg: "#f3f6f9", surface: "#ffffff", surfaceAlt: "#eaf3f8", fg: "#0f1b2a", muted: "#4f5d6e", border: "#c9d4df", rule: "#e2e9f0",
    primary: "#0a64a8", primaryFg: "#ffffff", accent: "#0a7f8c", primarySoft: "#e3f1fa", track: "#e6edf3",
    ok: "#0a6b3c", okBg: "#e3f5ea", err: "#a3161a", errBg: "#fdeaea", warnFg: "#6b4e00", warnBg: "#fff4d1", warnBorder: "#ecd27f",
    betaBg: "#0f1b2a", betaFg: "#ffffff", skeleton: "#e2e9f0",
    chart: ["#0a64a8", "#0a7f8c", "#5b6bd6", "#c2591a", "#7a4fb3", "#2f7d32", "#b23a6b", "#56606b"],
  },
  dark: {
    bg: "#0b1420", surface: "#13202f", surfaceAlt: "#18293b", fg: "#eef3f8", muted: "#a5b3c2", border: "#2c3e52", rule: "#203245",
    primary: "#4cc0ea", primaryFg: "#062033", accent: "#3fd0cf", primarySoft: "#123049", track: "#203245",
    ok: "#6fdc9a", okBg: "#12301f", err: "#ff8a85", errBg: "#3a1717", warnFg: "#ffd77a", warnBg: "#33280b", warnBorder: "#6b5517",
    betaBg: "#1d3247", betaFg: "#eef3f8", skeleton: "#203245",
    chart: ["#4cc0ea", "#3fd0cf", "#8f9bff", "#ff9d5c", "#c39bff", "#7fd67f", "#ff86b6", "#b7c0ca"],
  },
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const type = {
  title: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  h1: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  h2: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
} as const;
/** Cap Dynamic Type so layouts don't break, but still scale generously (WCAG 1.4.4). */
export const MAX_FONT_SCALE = 1.6;

const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
/** WCAG 2.x contrast ratio. */
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Text-direction props for a locale direction. */
export const textDir = (dir: "rtl" | "ltr") => ({ writingDirection: dir, textAlign: dir === "rtl" ? "right" : "left" } as const);
