"use client";

import { useMemo, useState } from "react";
import { ArrowSquareOut, Copy, Check, Robot } from "@phosphor-icons/react";
import type { Guide, Path } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";
import { EvidenceTag } from "./bits";

/**
 * The agent's hand-off: everything it can prepare without the developer's login.
 * Where a provider accepts prefilled creation links, one click opens the form ready to review.
 */
export default function SetupKit({ guide, path }: { guide: Guide; path: Path }) {
  const [name, setName] = useState("");
  const [home, setHome] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const appName = name.trim() || "My Agent";
  const homepage = home.trim() || "https://example.com";

  const slackManifest = useMemo(() => {
    const user = path.scopes.filter((s) => s.startsWith("search:"));
    const bot = path.scopes.filter((s) => !s.startsWith("search:"));
    return {
      display_information: { name: appName },
      features: { bot_user: { display_name: appName, always_online: false } },
      oauth_config: { redirect_urls: [COMPOSIO_CALLBACK], scopes: { bot, ...(user.length ? { user } : {}) } },
      settings: { org_deploy_enabled: false, socket_mode_enabled: false, token_rotation_enabled: false },
    };
  }, [appName, path.scopes]);

  let action: { label: string; href: string; evidence: Parameters<typeof EvidenceTag>[0]["evidence"] } | null = null;
  if (guide.slug === "github") {
    const q = new URLSearchParams({
      "oauth_application[name]": appName,
      "oauth_application[url]": homepage,
      "oauth_application[callback_url]": COMPOSIO_CALLBACK,
    });
    action = {
      label: "Open GitHub's form, prefilled",
      href: `https://github.com/settings/applications/new?${q}`,
      evidence: { kind: "tested", note: "On 2026-10-28 the form opened with name, homepage and the Composio callback filled in." },
    };
  } else if (guide.slug === "slack") {
    action = {
      label: "Create the app in Slack from this manifest",
      href: `https://api.slack.com/apps?new_app=1&manifest_json=${encodeURIComponent(JSON.stringify(slackManifest))}`,
      evidence: { kind: "sourced", url: "https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests" },
    };
  }

  const values: { label: string; value: string }[] = [
    { label: "Redirect URI", value: COMPOSIO_CALLBACK },
    ...(path.scopes.length ? [{ label: "Scopes", value: path.scopes.join(" ") }] : []),
    ...(guide.slug === "slack" ? [{ label: "App manifest (JSON)", value: JSON.stringify(slackManifest, null, 2) }] : []),
  ];

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy this:", value);
    }
  }

  return (
    <section className="section">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Agent-prepared</div>
          <h2>Start the setup</h2>
        </div>
        {action && <EvidenceTag evidence={action.evidence} />}
      </div>
      <div className="kit">
        <div className="kit-intro">
          <Robot size={18} weight="duotone" color="var(--agent)" aria-hidden="true" />
          <span>
            The agent fills in everything it can for <strong>{path.label}</strong>. You sign in, review and click create, because only you can.
          </span>
        </div>
        {action && (
          <div className="kit-fields">
            <label>
              <span className="label">Your product name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Agent" />
            </label>
            {guide.slug === "github" && (
              <label>
                <span className="label">Homepage URL</span>
                <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="https://example.com" />
              </label>
            )}
            <a className="btn-primary" href={action.href} target="_blank" rel="noreferrer" style={{ alignSelf: "end" }}>
              <ArrowSquareOut size={15} aria-hidden="true" />
              {action.label}
            </a>
          </div>
        )}
        <div className="kit-values">
          {values.map((v) => (
            <div className="kit-row" key={v.label}>
              <span className="label" style={{ minWidth: 120 }}>{v.label}</span>
              <pre className="kit-value">{v.value}</pre>
              <button className="btn-ghost" onClick={() => copy(v.label, v.value)} aria-label={`Copy ${v.label}`}>
                {copied === v.label ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied === v.label ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
        {!action && guide.consoleUrl && (
          <a className="btn-primary" href={guide.consoleUrl} target="_blank" rel="noreferrer" style={{ alignSelf: "start" }}>
            <ArrowSquareOut size={15} aria-hidden="true" />
            Open {guide.name.replace(/ \(.*\)$/, "")} developer console
          </a>
        )}
      </div>
    </section>
  );
}
