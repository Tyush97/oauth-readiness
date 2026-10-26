import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Gauge } from "@phosphor-icons/react/dist/ssr";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "OAuth Readiness",
  description: "How long until your OAuth app is approved? Setup guides for agent builders, with every claim marked verified, from docs or unconfirmed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark"><Gauge size={16} weight="bold" aria-hidden="true" /></span>
              OAuth Readiness
            </Link>
            <nav className="nav">
              <Link href="/#library">Guides</Link>
              <Link href="/method">How we check</Link>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
      </body>
    </html>
  );
}
