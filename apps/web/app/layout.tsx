import "./globals.css";
import { toCssVars } from "@geopoll/design-tokens";
import { dirOf, DICTS } from "@/lib/i18n";
import { config } from "@/lib/config";
import Providers from "./providers";
export const metadata = { title: "GeoPoll – הדגמה", robots: { index: false } };
export const viewport = { width: "device-width", initialScale: 1 };
const THEME = `:root{${toCssVars()}}`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const l = config().jurisdiction.defaultLocale;
  return (<html lang={l} dir={dirOf(l)}><head><style id="gp-tokens">{THEME}</style></head><body><div className="beta" role="note">{DICTS[l].beta}</div><Providers>{children}</Providers></body></html>);
}
