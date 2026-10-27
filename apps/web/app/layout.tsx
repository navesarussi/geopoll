import "./globals.css";
import Providers from "./providers";
export const metadata = { title: "GeoPoll – הדגמה", robots: { index: false } };
export const viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="he" dir="rtl"><body><div className="beta" role="note">בטא לבדיקה · הנתונים עלולים להתאפס · זו לא הצבעה רשמית</div><Providers>{children}</Providers></body></html>);
}
