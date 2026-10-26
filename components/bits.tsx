import type { Evidence, Who } from "@/lib/schema";
import { DIFFICULTY_LABELS } from "@/lib/schema";

const EVIDENCE_TEXT = { tested: "Tested", sourced: "Sourced", uncertain: "Uncertain" } as const;

export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  const label = EVIDENCE_TEXT[evidence.kind] + (evidence.kind === "sourced" && evidence.unofficial ? " (unofficial)" : "");
  const title = [evidence.note, evidence.url].filter(Boolean).join("\n");
  const cls = `chip chip-${evidence.kind}`;
  if (evidence.url) {
    return (
      <a className={cls} href={evidence.url} target="_blank" rel="noreferrer" title={title || undefined}>
        {label} ↗
      </a>
    );
  }
  return (
    <span className={cls} title={title || undefined}>
      {label}
    </span>
  );
}

const WHO_TEXT: Record<Who, string> = { agent: "Agent can do", you: "You", both: "Agent drafts, you do" };

export function WhoChip({ who }: { who: Who }) {
  return <span className={`chip chip-${who}`}>{WHO_TEXT[who]}</span>;
}

export function DifficultyMeter({ value }: { value: number }) {
  const color = `var(--d${value})`;
  return (
    <span className="meter" aria-label={`Difficulty ${value} of 5: ${DIFFICULTY_LABELS[value]?.label}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={i <= value ? { background: color } : undefined} />
      ))}
    </span>
  );
}

export function DifficultyTag({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
      <DifficultyMeter value={value} />
      <span style={{ color: `var(--d${value})` }}>{DIFFICULTY_LABELS[value]?.label}</span>
    </span>
  );
}

export function EvidenceLegend() {
  return (
    <div className="legend">
      <span>
        <span className="chip chip-tested">Tested</span> we did it in the provider console
      </span>
      <span>
        <span className="chip chip-sourced">Sourced</span> a linked doc says so
      </span>
      <span>
        <span className="chip chip-uncertain">Uncertain</span> conflicting or unconfirmed
      </span>
    </div>
  );
}

/** Renders `backtick` spans as inline code; everything else as plain text. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("`") && p.endsWith("`") && p.length > 2 ? <code key={i}>{p.slice(1, -1)}</code> : p))}
    </>
  );
}
