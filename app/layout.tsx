import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Geist, JetBrains_Mono } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import Sidebar from "@/components/Sidebar";
import { LIBRARY } from "@/data/guides";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OAuth Readiness",
  description: "How long until your OAuth app is approved? Setup guides for agent builders, with every claim marked verified, from docs or unconfirmed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there's no flash. */}
        <Script id="theme" strategy="beforeInteractive">{`try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`}</Script>
      </head>
      <body>
        <div className="shell">
          <Sidebar guides={LIBRARY.map((g) => ({ slug: g.slug, name: g.name, domain: g.domain }))} />
          <div className="shell-main">
            <header className="header mobile-only">
              <div className="container header-inner">
                <Link href="/" className="brand">
                  <span className="brand-mark" aria-hidden="true">OR</span>
                  <span className="badge" style={{ color: "var(--accent)" }}>Readiness</span>
                </Link>
                <div className="header-right">
                  <nav className="nav">
                    <Link href="/method">How we check</Link>
                  </nav>
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main>
              <div className="container">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
