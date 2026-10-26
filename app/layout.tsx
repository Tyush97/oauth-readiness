import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAuth Readiness",
  description: "How long will it take to get your OAuth app approved? Shareable setup guides for agent builders, with every claim marked tested, sourced or uncertain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">OR</span> OAuth Readiness
            </Link>
            <nav className="nav">
              <Link href="/">Guides</Link>
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
