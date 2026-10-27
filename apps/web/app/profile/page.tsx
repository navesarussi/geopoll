import { pageLang } from "@/lib/i18n";
import MyProfile from "./MyProfile";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang, t, dir } = await pageLang((await searchParams).lang);
  return <div lang={lang} dir={dir}><MyProfile t={t} lq={`?lang=${lang}`} /></div>;
}
