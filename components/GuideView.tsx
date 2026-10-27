"use client";

import { useMemo, useState } from "react";
import {
  LinkSimple,
  MarkdownLogo,
  ArrowSquareOut,
  Hammer,
  Hourglass,
  RocketLaunch,
  Warning,
  Wrench,
  Check,
  Lightning,
  CaretDown,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";
import type { Guide, Step } from "@/lib/schema";
import { guideToMarkdown } from "@/lib/markdown";
import { DifficultyTag, EvidenceTag, Rich, WhoIcon, launchLabel } from "./bits";
import Logo from "./Logo";
import SetupKit from "./SetupKit";

const PHASES: { id: Step["phase"]; label: string }[] = [
  { id: "prepare", label: "Before you start" },
  { id: "create", label: "Create the app" },
  { id: "test", label: "Test with your own account" },
  { id: "production", label: "Open it to everyone" },
];

export default function GuideView({ guide, shareUrl }: { guide: Guide; shareUrl?: string }) {
  const initial = guide.defaultPath && guide.paths.some((p) => p.id === guide.defaultPath) ? guide.defaultPath : guide.paths[0].id;
  const [pathId, setPathId] = useState(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const path = guide.paths.find((p) => p.id === pathId) ?? guide.paths[0];
  const steps = useMemo(() => guide.steps.filter((s) => !s.paths?.length || s.paths.includes(path.id)), [guide, path.id]);
  const counts = { agent: steps.filter((s) => s.who === "agent").length, both: steps.filter((s) => s.who === "both").length, you: steps.filter((s) => s.who === "you").length };

  async function copy(kind: "link" | "md") {
    const url = shareUrl ?? window.location.href;
    const text = kind === "link" ? url : guideToMarkdown(guide, url);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  const live = launchLabel(path);
  return (
    <article className="narrow" style={{ margin: "0 auto" }}>
      <header className="guide-hero">
        <Logo domain={guide.domain ?? guide.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")} name={guide.name} size={56} />
        <div>
          <div className="crumbs">
            <span>{guide.category}</span>
            <span>Checked {guide.lastChecked}</span>
            {guide.tested && (
              <span className="chip chip-ok"><CheckCircle size={13} weight="bold" aria-hidden="true" /> Setup verified by us</span>
            )}
            {guide.origin === "generated" && (
              <span className="chip chip-warn"><Lightning size={13} weight="fill" aria-hidden="true" /> Written live from docs</span>
            )}
          </div>
          <h1 style={{ fontSize: "clamp(28px, 3.6vw, 38px)" }}>{guide.name}</h1>
          <p className="summary"><Rich text={guide.summary} /></p>
          <div className="toolbar">
            <button className="btn-primary" onClick={() => copy("link")}><LinkSimple size={15} aria-hidden="true" />{copied === "link" ? "Copied" : "Share link"}</button>
            <button className="btn-ghost" onClick={() => copy("md")}><MarkdownLogo size={15} aria-hidden="true" />{copied === "md" ? "Copied" : "Copy as Markdown"}</button>
            {guide.consoleUrl && (
              <a className="btn-ghost" href={guide.consoleUrl} target="_blank" rel="noreferrer"><ArrowSquareOut size={15} aria-hidden="true" />Developer console</a>
            )}
          </div>
        </div>
      </header>

      {guide.origin === "generated" && (
        <div className="callout callout-warn" style={{ marginTop: 24 }}>
          <Info size={18} aria-hidden="true" style={{ flex: "none", marginTop: 1 }} />
          <span>An agent wrote this from {guide.sources.length} official doc pages it just read. Nothing was tried in a real console, so treat it as a strong first draft.</span>
        </div>
      )}

      <section className="section" style={{ marginTop: 40 }}>
        <h2 style={{ marginBottom: 4 }}>What does your agent need to do?</h2>
        <p className="faint" style={{ marginBottom: 16 }}>The permissions you ask for decide how much review you face.</p>
        <div className="paths" role="radiogroup" aria-label="Use case">
          {guide.paths.map((p) => (
            <button key={p.id} className="path" role="radio" aria-checked={p.id === path.id} onClick={() => setPathId(p.id)}>
              <span className="label">{p.label}</span>
              <DifficultyTag value={p.difficulty} label={launchLabel(p) || undefined} />
              <span className="use"><Rich text={p.useCase} /></span>
            </button>
          ))}
        </div>

        <div className="verdict">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div className="faint">Scopes: {path.scopes.map((s) => <code key={s} style={{ marginRight: 4 }}>{s}</code>)}</div>
            <EvidenceTag evidence={path.evidence} />
          </div>
          <div className="journey">
            <div className="stage">
              <div className="stage-bar" style={{ background: "var(--d1)" }} />
              <div className="stage-name"><Hammer size={14} aria-hidden="true" /> Build and test</div>
              <div className="stage-value">{path.timeToFirstToken}</div>
              <div className="stage-note">Working token for your own account</div>
            </div>
            <div className="stage">
              <div className="stage-bar" style={{ background: `var(--d${path.difficulty})`, opacity: path.difficulty <= 1 ? 0.35 : 1 }} />
              <div className="stage-name"><Hourglass size={14} aria-hidden="true" /> Approval</div>
              <div className="stage-value">{path.timeToProduction}</div>
              <div className="stage-note"><Rich text={path.gate} /></div>
            </div>
            <div className="stage">
              <div className="stage-bar" style={{ background: "var(--ok)", opacity: 0.5 }} />
              <div className="stage-name"><RocketLaunch size={14} aria-hidden="true" /> Launch</div>
              <div className="stage-value">{live || "See approval"}</div>
              <div className="stage-note">Rough total until any user can connect</div>
            </div>
          </div>
          <div className="split">
            <span className="split-bar" aria-hidden="true">
              <span style={{ width: `${(counts.agent / steps.length) * 100}%`, background: "var(--agent)" }} />
              <span style={{ width: `${(counts.both / steps.length) * 100}%`, background: "var(--border-strong)" }} />
              <span style={{ width: `${(counts.you / steps.length) * 100}%`, background: "var(--you)" }} />
            </span>
            <span>
              An agent can do <strong style={{ color: "var(--text)" }}>{counts.agent}</strong> of {steps.length} steps and prepare {counts.both} more. You do {counts.you}.
            </span>
            <span style={{ marginLeft: "auto" }} className="chip chip-neutral" title={guide.composio.note}>
              {guide.composio.managed === "yes" ? "Composio has a managed app: prototype today" : guide.composio.managed === "no" ? "Composio: bring your own app" : "Composio support unknown"}
            </span>
          </div>
        </div>
      </section>

      <SetupKit guide={guide} path={path} />

      <section className="section">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2>Steps</h2>
          <span style={{ display: "flex", gap: "8px 16px", fontSize: 13, color: "var(--muted)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><WhoIcon who="agent" /> Agent</span>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><WhoIcon who="both" /> Agent prepares, you finish</span>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><WhoIcon who="you" /> You</span>
          </span>
        </div>
        {PHASES.map((ph) => {
          const items = steps.filter((s) => s.phase === ph.id);
          if (!items.length) return null;
          return (
            <div key={ph.id}>
              <div className="phase">{ph.label} <span className="count">{items.length}</span></div>
              <ol className="steps">
                {items.map((s) => (
                  <li className="step" key={s.title}>
                    <WhoIcon who={s.who} />
                    <div>
                      <div className="step-title"><Rich text={s.title} /></div>
                      <div className="step-detail"><Rich text={s.detail} /></div>
                      {s.evidence.note && (
                        <details className="more">
                          <summary><CaretDown size={12} aria-hidden="true" />{s.evidence.kind === "tested" ? "What we saw" : "Note"}</summary>
                          <Rich text={s.evidence.note} />
                        </details>
                      )}
                    </div>
                    <div className="ev-col"><EvidenceTag evidence={s.evidence} /></div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 16 }}>Where developers get stuck</h2>
        <div className="blockers">
          {guide.gotchas.map((g) => (
            <div className="blocker" key={g.title}>
              <div className="title">
                <span style={{ display: "flex", gap: 8 }}><Warning size={18} color="var(--d4)" weight="duotone" style={{ flex: "none", marginTop: 2 }} aria-hidden="true" /><span><Rich text={g.title} /></span></span>
                <EvidenceTag evidence={g.evidence} compact />
              </div>
              <div className="step-detail" style={{ marginTop: 0 }}><Rich text={g.detail} /></div>
              {g.fix && <div className="fix"><Wrench size={14} weight="bold" style={{ flex: "none", marginTop: 2 }} aria-hidden="true" /><span><Rich text={g.fix} /></span></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="section who-cols">
        <div className="who-col">
          <h3><WhoIcon who="agent" /> An agent can do</h3>
          <ul className="ticks-list">{guide.agentCan.map((a) => <li key={a}><Check size={14} weight="bold" color="var(--agent)" aria-hidden="true" /><span><Rich text={a} /></span></li>)}</ul>
        </div>
        <div className="who-col">
          <h3><WhoIcon who="you" /> You take over</h3>
          <ul className="ticks-list">{guide.youMust.map((a) => <li key={a}><Check size={14} weight="bold" color="var(--you)" aria-hidden="true" /><span><Rich text={a} /></span></li>)}</ul>
        </div>
      </section>

      {guide.tested && (
        <section className="section">
          <div className="callout callout-ok">
            <CheckCircle size={20} weight="duotone" color="var(--ok)" style={{ flex: "none" }} aria-hidden="true" />
            <div>
              <strong>We set this up ourselves on {guide.tested.date}.</strong> <span className="muted"><Rich text={guide.tested.summary} /></span>
              {guide.tested.corrections.length > 0 && (
                <ul className="list" style={{ marginTop: 8 }}>{guide.tested.corrections.map((c) => <li key={c}><Rich text={c} /></li>)}</ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <details className="fold">
          <summary>
            <span>Sources and open questions <span className="faint">({guide.sources.length} sources, {guide.uncertain.length} open)</span></span>
            <CaretDown size={16} aria-hidden="true" />
          </summary>
          <div>
            {guide.uncertain.length > 0 && (
              <>
                <h3 style={{ margin: "0 0 8px" }}>Not verified</h3>
                <ul className="list">{guide.uncertain.map((u) => <li key={u}><Rich text={u} /></li>)}</ul>
              </>
            )}
            <h3 style={{ margin: "20px 0 8px" }}>Sources</h3>
            <ul className="list">
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                  {s.official === false && <span className="faint"> (unofficial)</span>}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>
    </article>
  );
}
