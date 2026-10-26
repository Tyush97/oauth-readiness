import Link from "next/link";
import { LIBRARY } from "@/data/guides";
import { DifficultyTag, EvidenceLegend } from "@/components/bits";
import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <>
      <h1>Will your OAuth app be ready in an hour, or in eight weeks?</h1>
      <p className="lede">
        Before your agent&apos;s users can connect Gmail, Slack or LinkedIn under your name, you need your own OAuth app, and some providers make you wait for review. Look up an app to see the effort, the wait, the blockers, and which steps an agent can do for you.
      </p>
      <SearchBox librarySlugs={LIBRARY.map((g) => g.slug)} />

      <section className="section">
        <h2>Library</h2>
        <EvidenceLegend />
        <div className="grid">
          {LIBRARY.map((g) => {
            const min = Math.min(...g.paths.map((p) => p.difficulty));
            const max = Math.max(...g.paths.map((p) => p.difficulty));
            return (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card">
                <div className="card-top">
                  <h3>{g.name}</h3>
                  {g.tested ? <span className="chip chip-tested">Setup tested</span> : <span className="chip chip-sourced">Sourced</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <DifficultyTag value={min} />
                  {max !== min && (
                    <>
                      <span className="faint">to</span>
                      <DifficultyTag value={max} />
                    </>
                  )}
                </div>
                <p>{g.summary.split(". ")[0]}.</p>
                <div className="faint">{g.paths.map((p) => p.label).join(" · ")}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section panel">
        <h2>How to read a guide</h2>
        <ul className="list">
          <li><strong>Difficulty depends on what your agent does.</strong> Sending Gmail and reading Gmail sit in different review tiers, so each guide splits into paths.</li>
          <li><strong>Two clocks.</strong> &ldquo;First working token&rdquo; is when you can build. &ldquo;Any user can connect&rdquo; is when you can launch.</li>
          <li><strong>Every step says who does it.</strong> An agent can pick scopes and draft policies; you sign in, verify your business and click Submit.</li>
          <li><strong>Every claim shows its evidence.</strong> <Link href="/method">How we check</Link></li>
        </ul>
      </section>
    </>
  );
}
