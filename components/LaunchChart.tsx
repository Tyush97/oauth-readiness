import Link from "next/link";
import type { Guide, Path } from "@/lib/schema";
import Logo from "./Logo";
import { launchLabel } from "./bits";

/** Log-ish scale: same day at the left, "gated" pinned to the right edge. */
const pos = (d: number | null | undefined) => (d === null || d === undefined ? 97 : 3 + (Math.log(1 + d) / Math.log(1 + 120)) * 80);
const TICKS: { label: string; d: number | null }[] = [
  { label: "Same day", d: 0 },
  { label: "1 week", d: 7 },
  { label: "1 month", d: 30 },
  { label: "3 months", d: 90 },
  { label: "Gated", d: null },
];

const order = (p: Path) => (p.launchDays === null ? 1e9 : p.launchDays ?? 0);

export default function LaunchChart({ guides }: { guides: Guide[] }) {
  const rows = guides
    .map((g) => {
      const sorted = [...g.paths].sort((a, b) => order(a) - order(b));
      return { g, fast: sorted[0], slow: sorted[sorted.length - 1] };
    })
    .sort((a, b) => order(a.slow) - order(b.slow));

  return (
    <figure className="chart" aria-label="Time from a working OAuth app to any user being able to connect, by app">
      <div className="chart-title">
        <h3>Time to launch</h3>
        <span className="faint">until any user can connect</span>
      </div>
      {rows.map(({ g, fast, slow }, i) => {
        const a = pos(fast.launchDays);
        const b = pos(slow.launchDays);
        return (
          <div className="chart-row" key={g.slug}>
            <Link href={`/guides/${g.slug}`}>
              <Logo domain={g.domain} name={g.name} size={22} />
              {g.name.replace(/ \(.*\)$/, "")}
            </Link>
            <div className="chart-track">
              {TICKS.map((t) => (
                <span key={t.label} className="tick-line" style={{ left: `${pos(t.d)}%` }} aria-hidden="true" />
              ))}
              {b > a && <span className="dumbbell" style={{ left: `${a}%`, width: `${b - a}%`, animationDelay: `${i * 70}ms` }} />}
              <span
                className="dot"
                title={`${fast.label}: ${launchLabel(fast)}`}
                style={{ left: `${a}%`, background: `var(--d${fast.difficulty})`, animationDelay: `${i * 70}ms` }}
              />
              {b > a && (
                <span
                  className="dot"
                  title={`${slow.label}: ${launchLabel(slow)}`}
                  style={{ left: `${b}%`, background: `var(--d${slow.difficulty})`, animationDelay: `${i * 70 + 250}ms` }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="chart-axis" aria-hidden="true">
        <span />
        <div className="ticks">
          {TICKS.map((t) => (
            <span key={t.label} style={{ left: `${pos(t.d)}%` }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span><i style={{ background: "var(--d1)" }} />Simplest use case</span>
        <span><i style={{ background: "var(--d5)" }} />Hardest use case</span>
      </div>
    </figure>
  );
}
