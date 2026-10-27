export * from "@geopoll/i18n";
import { headers } from "next/headers";
import { DICTS, dirOf, resolveLocale } from "@geopoll/i18n";
import { config } from "./config";

/** Resolve the UI locale: explicit ?lang=, else the remembered one (middleware → x-gp-lang), validated against config locales (ADR-0022). */
export async function pageLang(q?: string) {
  const j = config().jurisdiction;
  const want = q ?? (await headers()).get("x-gp-lang") ?? undefined;
  const lang = resolveLocale(want, j.locales, j.defaultLocale);
  return { lang, t: DICTS[lang], dir: dirOf(lang) };
}
