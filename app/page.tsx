import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
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
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Library</div>
            <h2>Ready guides</h2>
          </div>
          <Link href="/method" className="faint">How we check each claim</Link>
        </div>
        <div className="grid">
          {LIBRARY.map((g) => {
            const sorted = [...g.paths].sort((a, b) => a.difficulty - b.difficulty);
            const fast = sorted[0];
            const slow = sorted[sorted.length - 1];
            return (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-list">
                <div className="card-head">
                  <Logo domain={g.domain} name={g.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{g.name}</div>
                    <div className="faint" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {g.category}
                      {g.tested && <span className="badge" style={{ color: "var(--ok)", fontSize: 9.5, padding: "0 5px" }}>Verified</span>}
                    </div>
                  </div>
                  <ArrowUpRight size={16} color="var(--faint)" style={{ alignSelf: "flex-start" }} aria-hidden="true" />
                </div>
                <p className="tagline">{g.summary.split(". ")[0]}.</p>
                <div className="card-rows">
                  {[fast, ...(slow.id !== fast.id ? [slow] : [])].map((p) => (
                    <div key={p.id} className="card-row">
                      <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
                      <span style={{ fontWeight: 500, whiteSpace: "nowrap", color: `var(--d${p.difficulty})` }}>{launchLabel(p)}</span>
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
