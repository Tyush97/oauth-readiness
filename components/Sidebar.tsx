"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

type Item = { slug: string; name: string; domain?: string };

/** App shell sidebar, modelled on Composio's dashboard: brand + product badge, icon nav, a mono-labelled list. */
export default function Sidebar({ guides }: { guides: Item[] }) {
  const path = usePathname();
  const nav = [
    { href: "/", label: "Home", Icon: House, active: path === "/" },
    { href: "/?search=1", label: "Search apps", Icon: MagnifyingGlass, active: false },
    { href: "/method", label: "How we check", Icon: ShieldCheck, active: path.startsWith("/method") },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">OR</span>
          <span className="badge" style={{ color: "var(--accent)" }}>Readiness</span>
        </Link>
      </div>
      <nav className="side-nav" aria-label="Main">
        {nav.map(({ href, label, Icon, active }) => (
          <Link
            key={label}
            href={href}
            className="side-item"
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              // On the home page, "Search apps" just focuses the search box.
              const box = document.querySelector<HTMLInputElement>('[role="combobox"]');
              if (href.includes("search") && box) {
                e.preventDefault();
                box.focus();
              }
            }}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="side-group">
        <div className="label" style={{ padding: "0 8px", marginBottom: 6 }}>Guides</div>
        {guides.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="side-item side-guide" aria-current={path === `/guides/${g.slug}` ? "page" : undefined}>
            <Logo domain={g.domain} name={g.name} size={18} />
            {g.name.replace(/ \(.*\)$/, "")}
          </Link>
        ))}
      </div>
      <div className="side-foot">
        <span className="faint" style={{ fontSize: 12 }}>OAuth app readiness for agent builders</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
