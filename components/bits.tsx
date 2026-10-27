import { CheckCircle, BookOpen, Question, Robot, User, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { Evidence, Path, Who } from "@/lib/schema";
import { DIFFICULTY_LABELS } from "@/lib/schema";

/** Plain-language evidence labels. Internally: tested / sourced / uncertain. */
export const EVIDENCE = {
  tested: { label: "Verified", long: "We did this ourselves in the provider's console", Icon: CheckCircle },
  sourced: { label: "From docs", long: "Stated in the linked documentation", Icon: BookOpen },
  uncertain: { label: "Unconfirmed", long: "Sources conflict or we couldn't confirm it", Icon: Question },
} as const;

export function EvidenceTag({ evidence, compact }: { evidence: Evidence; compact?: boolean }) {
  const e = EVIDENCE[evidence.kind];
  const label = e.label + (evidence.kind === "sourced" && evidence.unofficial ? " (unofficial)" : "");
  const title = [e.long, evidence.note, evidence.url].filter(Boolean).join("\n");
  const body = (
    <>
      <e.Icon size={14} weight="bold" aria-hidden="true" />
      {!compact && label}
    </>
  );
  const cls = `ev ev-${evidence.kind}`;
  return evidence.url ? (
    <a className={cls} href={evidence.url} target="_blank" rel="noreferrer" title={title} aria-label={`${label}: open source`}>
      {body}
    </a>
  ) : (
    <span className={cls} title={title} aria-label={label}>
      {body}
    </span>
  );
}

const WHO = {
  agent: { label: "Agent can do this", Icon: Robot },
  you: { label: "You do this", Icon: User },
  both: { label: "Agent prepares, you finish", Icon: UsersThree },
} as const;

export function WhoIcon({ who }: { who: Who }) {
  const w = WHO[who];
  return (
    <span className={`who who-${who}`} title={w.label} aria-label={w.label}>
      <w.Icon size={17} weight="duotone" />
    </span>
  );
}

export function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="meter" aria-label={`Difficulty ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={i <= value ? { background: `var(--d${value})` } : undefined} />
      ))}
    </span>
  );
}

export function DifficultyTag({ value, label }: { value: number; label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
      <DifficultyMeter value={value} />
      <span style={{ color: `var(--d${value})` }}>{label ?? DIFFICULTY_LABELS[value]?.label}</span>
    </span>
  );
}

/** Short "time to launch" phrase for a path, from its numeric estimate. */
export function launchLabel(p: Pick<Path, "launchDays">): string {
  const d = p.launchDays;
  if (d === null) return "No set timeline";
  if (d === undefined) return "";
  if (d <= 0) return "Same day";
  if (d < 7) return `~${d} days`;
  if (d < 56) return `~${Math.max(1, Math.round(d / 7))} week${Math.round(d / 7) > 1 ? "s" : ""}`;
  return `~${Math.round(d / 30)} month${Math.round(d / 30) > 1 ? "s" : ""}`;
}

export function EvidenceLegend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", fontSize: 13, color: "var(--muted)", alignItems: "center" }}>
      {(Object.keys(EVIDENCE) as (keyof typeof EVIDENCE)[]).map((k) => (
        <span key={k} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <EvidenceTag evidence={{ kind: k }} />
          <span>{EVIDENCE[k].long.toLowerCase()}</span>
        </span>
      ))}
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
