import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { LIBRARY } from "@/data/guides";
import { launchLabel } from "@/components/bits";
import Logo from "@/components/Logo";
import LaunchChart from "@/components/LaunchChart";
import SearchCombobox, { type LibraryEntry } from "@/components/SearchCombobox";
import { listToolkits } from "@/lib/agent/composio";

export const revalidate = 86400;

const ALIASES: Record<string, string[]> = {
  gmail: ["Google Mail", "Google"],
  instagram: ["Meta", "Facebook"],
  linkedin: [],
  github: [],
  slack: [],
  notion: [],
  hubspot: [],
};

export default async function Home() {
  const toolkits = await listToolkits();
  const library: LibraryEntry[] = LIBRARY.map((g) => ({
    slug: g.slug,
    name: g.name,
    domain: g.domain,
    min: Math.min(...g.paths.map((p) => p.difficulty)),
    max: Math.max(...g.paths.map((p) => p.difficulty)),
    tested: !!g.tested,
    aliases: [g.slug, g.domain ?? "", ...(ALIASES[g.slug] ?? [])].filter(Boolean),
  }));

  return (
    <>
      <section className="hero">
        <div>
          <h1>Know how long your OAuth app will take to approve.</h1>
          <p className="sub">Setup steps, review wait times and blockers for the apps your agent connects to, before you start.</p>
          <SearchCombobox library={library} toolkits={toolkits} />
        </div>
        <LaunchChart guides={LIBRARY} />
      </section>

      <section className="section" id="library">
        <div className="section-head">
          <h2>Ready guides</h2>
          <Link href="/method" className="faint">How we check each claim</Link>
        </div>
        <div className="grid">
          {LIBRARY.map((g) => {
            const sorted = [...g.paths].sort((a, b) => a.difficulty - b.difficulty);
            const fast = sorted[0];
            const slow = sorted[sorted.length - 1];
            return (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card">
                <div className="card-head">
                  <Logo domain={g.domain} name={g.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{g.name}</div>
                    <div className="faint">{g.category}</div>
                  </div>
                  {g.tested && (
                    <span className="chip chip-ok" title="We set this app up ourselves">
                      <CheckCircle size={13} weight="bold" aria-hidden="true" /> Verified
                    </span>
                  )}
                </div>
                <p className="tagline">{g.summary.split(". ")[0]}.</p>
                <div className="card-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                  {[fast, ...(slow.id !== fast.id ? [slow] : [])].map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap", color: `var(--d${p.difficulty})` }}>{launchLabel(p)}</span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
