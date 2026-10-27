import "./globals.css";
import { toCssVars } from "@geopoll/design-tokens";
import { pageLang } from "@/lib/i18n";
import Providers from "./providers";
export const metadata = { title: "GeoPoll (beta)", robots: { index: false } };
export const viewport = { width: "device-width", initialScale: 1 };
const THEME = `:root{${toCssVars()}}`;
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t, dir } = await pageLang();
  return (<html lang={lang} dir={dir}><head><style id="gp-tokens">{THEME}</style></head><body><div className="beta" role="note">{t.beta}</div><Providers>{children}</Providers></body></html>);
}
