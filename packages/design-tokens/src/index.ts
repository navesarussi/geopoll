/** ADR-0022 design tokens: single source for colors/radii/spacing/typography. Apps consume via toCssVars(). */
export const tokens = {
  color: {
    bg: "#f6f7f9", fg: "#111111", muted: "#555555", primary: "#2b59c3", primaryFg: "#ffffff", surface: "#ffffff",
    track: "#eef1f6", fill: "#c9d6f3", ok: "#0a6b2e", err: "#a40000", border: "#c5ccd8", rule: "#e1e6ef",
    betaBg: "#7a1f1f", betaFg: "#ffffff", warnBg: "#fff3cd", warnFg: "#7a5a00", warnBorder: "#f0d58a", infoBg: "#e8eefc", infoFg: "#1d3d8f",
  },
  radius: { sm: "8px", md: "10px", lg: "12px", pill: "999px" },
  space: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "28px" },
  font: { family: 'system-ui,-apple-system,"Segoe UI",Arial,sans-serif', base: "1rem", small: ".82rem", h1: "1.35rem", h2: "1.05rem" },
  layout: { maxWidth: "480px" },
} as const;
export type Tokens = typeof tokens;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
/** Flatten to CSS custom properties: --gp-color-primary etc. */
export function toCssVars(t: Record<string, Record<string, string>> = tokens as never): string {
  return Object.entries(t).flatMap(([g, vals]) => Object.entries(vals).map(([k, v]) => `--gp-${g}-${kebab(k)}:${v}`)).join(";");
}
