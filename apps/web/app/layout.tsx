import "./globals.css";
import Providers from "./providers";
export const metadata = { title: "GeoPoll – הדגמה", robots: { index: false } };
export const viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="he" dir="rtl"><body><Providers>{children}</Providers></body></html>);
}
