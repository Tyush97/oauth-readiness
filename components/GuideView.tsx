"use client";

import { useMemo, useState } from "react";
import type { Guide, Step } from "@/lib/schema";
import { DIFFICULTY_LABELS } from "@/lib/schema";
import { guideToMarkdown } from "@/lib/markdown";
import { DifficultyTag, EvidenceChip, EvidenceLegend, Rich, WhoChip } from "./bits";

const PHASES: { id: Step["phase"]; label: string }[] = [
  { id: "prepare", label: "Before you start" },
  { id: "create", label: "Create the app" },
  { id: "test", label: "Test with your own account" },
  { id: "production", label: "Open it to everyone" },
];

export default function GuideView({ guide, shareUrl }: { guide: Guide; shareUrl?: string }) {
  const [pathId, setPathId] = useState(guide.defaultPath && guide.paths.some((p) => p.id === guide.defaultPath) ? guide.defaultPath : guide.paths[0].id);
  const [copied, setCopied] = useState<string | null>(null);
  const path = guide.paths.find((p) => p.id === pathId) ?? guide.paths[0];
  const steps = useMemo(() => guide.steps.filter((s) => !s.paths?.length || s.paths.includes(path.id)), [guide, path.id]);

  async function copy(kind: "link" | "md") {
    const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    const text = kind === "link" ? url : guideToMarkdown(guide, url);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  let n = 0;
  return (
    <article>
      <div className="guide-head">
        <div className="guide-meta">
          <span>{guide.category}</span>
          <span>Checked {guide.lastChecked}</span>
          {guide.tested && <span className="chip chip-tested">Setup tested {guide.tested.date}</span>}
          {guide.origin === "generated" && <span className="chip chip-uncertain">Generated live, not tested</span>}
        </div>
        <h1>{guide.name}: OAuth app readiness</h1>
        <p className="lede" style={{ marginTop: 0 }}><Rich text={guide.summary} /></p>
        <div className="toolbar">
          <button className="btn-ghost" onClick={() => copy("link")}>{copied === "link" ? "Link copied" : "Copy share link"}</button>
          <button className="btn-ghost" onClick={() => copy("md")}>{copied === "md" ? "Markdown copied" : "Copy as Markdown"}</button>
          {guide.consoleUrl && (
            <a className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }} href={guide.consoleUrl} target="_blank" rel="noreferrer">
              Open developer console ↗
            </a>
          )}
        </div>
      </div>

      {guide.origin === "generated" && (
        <div className="banner banner-generated section" style={{ marginTop: 20 }}>
          An agent wrote this guide a moment ago from public web sources. Nothing here was tried in a real console. Every claim links to the source it came from, and any claim whose source couldn&apos;t be confirmed is marked Uncertain.
        </div>
      )}

      <section className="section">
        <h2>What does your agent need to do?</h2>
        <p className="muted" style={{ fontSize: 14 }}>The scopes you need decide how much review you face, so pick the closest match.</p>
        <div className="tabs" role="group" aria-label="Use case">
          {guide.paths.map((p) => (
            <button key={p.id} className="tab" aria-pressed={p.id === path.id} onClick={() => setPathId(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}><Rich text={path.useCase} /></div>
              <div className="faint" style={{ marginTop: 2 }}>
                Scopes: {path.scopes.map((s, i) => <code key={s} style={{ marginLeft: i ? 4 : 0 }}>{s}</code>)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <DifficultyTag value={path.difficulty} />
              <div className="faint">{DIFFICULTY_LABELS[path.difficulty].hint}</div>
            </div>
          </div>
          <div className="verdict">
            <div className="stat"><div className="stat-label">First working token</div><div className="stat-value">{path.timeToFirstToken}</div></div>
            <div className="stat"><div className="stat-label">Any user can connect</div><div className="stat-value">{path.timeToProduction}</div></div>
            <div className="stat"><div className="stat-label">What stands in the way</div><div className="stat-value" style={{ fontWeight: 500, fontSize: 14 }}><Rich text={path.gate} /></div></div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <EvidenceChip evidence={path.evidence} />
            {path.evidence.note && <span className="faint"><Rich text={path.evidence.note} /></span>}
          </div>
        </div>
        <div className="panel" style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <span className="chip chip-neutral">Composio managed app: {guide.composio.managed}</span>
          <span style={{ fontSize: 14, flex: 1, minWidth: 220 }}><Rich text={guide.composio.note} /></span>
          <EvidenceChip evidence={guide.composio.evidence} />
        </div>
      </section>

      <section className="section">
        <h2>Steps for &ldquo;{path.label}&rdquo;</h2>
        <EvidenceLegend />
        {PHASES.map((ph) => {
          const items = steps.filter((s) => s.phase === ph.id);
          if (!items.length) return null;
          return (
            <div key={ph.id}>
              <div className="phase">{ph.label}</div>
              <ol className="steps">
                {items.map((s) => {
                  n += 1;
                  return (
                    <li className="step" key={s.title}>
                      <span className="step-num">{n}</span>
                      <div>
                        <div className="step-title">
                          <span><Rich text={s.title} /></span>
                          <WhoChip who={s.who} />
                          <EvidenceChip evidence={s.evidence} />
                        </div>
                        <div className="step-detail"><Rich text={s.detail} /></div>
                        {s.evidence.note && <div className="faint" style={{ marginTop: 4 }}>{s.evidence.kind === "tested" ? "What we saw: " : "Note: "}<Rich text={s.evidence.note} /></div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>

      <section className="section">
        <h2>Where developers get stuck</h2>
        <div className="panel">
          {guide.gotchas.map((g) => (
            <div className="gotcha" key={g.title}>
              <div className="step-title"><span><Rich text={g.title} /></span><EvidenceChip evidence={g.evidence} /></div>
              <div className="step-detail"><Rich text={g.detail} /></div>
              {g.fix && <div className="fix"><strong>Fix:</strong> <Rich text={g.fix} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="section two-col">
        <div className="panel">
          <h2><span className="chip chip-agent">Agent</span> What an agent can do for you</h2>
          <ul className="list">{guide.agentCan.map((a) => <li key={a}><Rich text={a} /></li>)}</ul>
        </div>
        <div className="panel">
          <h2><span className="chip chip-you">You</span> Where you take over</h2>
          <ul className="list">{guide.youMust.map((a) => <li key={a}><Rich text={a} /></li>)}</ul>
        </div>
      </section>

      {guide.tested && (
        <section className="section">
          <h2>What our setup attempt found</h2>
          <div className="banner banner-tested">
            <p><Rich text={guide.tested.summary} /></p>
            {guide.tested.corrections.length > 0 && (
              <ul className="list">{guide.tested.corrections.map((c) => <li key={c}><Rich text={c} /></li>)}</ul>
            )}
          </div>
        </section>
      )}

      {guide.uncertain.length > 0 && (
        <section className="section">
          <h2>What we couldn&apos;t verify</h2>
          <ul className="list">{guide.uncertain.map((u) => <li key={u}><Rich text={u} /></li>)}</ul>
        </section>
      )}

      <section className="section">
        <h2>Sources</h2>
        <ul className="list">
          {guide.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              {s.official === false && <span className="faint"> (unofficial)</span>}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
