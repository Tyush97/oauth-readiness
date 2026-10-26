import type { Evidence, Guide } from "./schema";
import { DIFFICULTY_LABELS } from "./schema";

const tag = (e: Evidence) =>
  `[${e.kind}${e.unofficial ? ", unofficial" : ""}${e.url ? `: ${e.url}` : ""}]`;

const WHO = { agent: "Agent", you: "You", both: "Agent drafts, you do" } as const;

/** Plain Markdown so a guide can be pasted into a ticket, PR or doc. */
export function guideToMarkdown(g: Guide, link?: string): string {
  const out: string[] = [];
  out.push(`# OAuth readiness: ${g.name}`);
  out.push(`_Checked ${g.lastChecked}. ${g.origin === "generated" ? "Generated live by an agent from web sources; not tested." : "Library guide."}_${link ? ` ${link}` : ""}`);
  out.push("", g.summary, "");
  out.push(`**Composio managed app:** ${g.composio.managed}. ${g.composio.note}`, "");
  out.push("## Pick your path", "");
  out.push("| Path | Difficulty | First token | Production | Gate |", "|---|---|---|---|---|");
  for (const p of g.paths) {
    out.push(`| ${p.label} (${p.scopes.join(", ")}) | ${DIFFICULTY_LABELS[p.difficulty].label} | ${p.timeToFirstToken} | ${p.timeToProduction} | ${p.gate} |`);
  }
  out.push("", "## Steps", "");
  g.steps.forEach((s, i) => {
    const scope = s.paths?.length ? ` _(paths: ${s.paths.join(", ")})_` : "";
    out.push(`${i + 1}. **${s.title}** (${WHO[s.who]})${scope}: ${s.detail} ${tag(s.evidence)}`);
  });
  out.push("", "## Where developers get stuck", "");
  for (const x of g.gotchas) out.push(`- **${x.title}.** ${x.detail}${x.fix ? ` Fix: ${x.fix}` : ""} ${tag(x.evidence)}`);
  out.push("", "## What an agent can do", "", ...g.agentCan.map((a) => `- ${a}`));
  out.push("", "## Where you take over", "", ...g.youMust.map((a) => `- ${a}`));
  if (g.uncertain.length) out.push("", "## Not verified", "", ...g.uncertain.map((a) => `- ${a}`));
  out.push("", "## Sources", "", ...g.sources.map((s) => `- [${s.title}](${s.url})${s.official === false ? " (unofficial)" : ""}`));
  return out.join("\n");
}
