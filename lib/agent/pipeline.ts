import { Guide, COMPOSIO_CALLBACK, type Evidence } from "@/lib/schema";
import { findInLibrary } from "@/data/guides";
import { generate } from "./gemini";
import { checkSources, probeConsole, type CheckedSource } from "./sources";
import { lookupComposio, MANAGED_AUTH_MD } from "./composio";

export type AgentEvent =
  | { type: "status"; step: string; message: string }
  | { type: "library"; slug: string }
  | { type: "source"; source: CheckedSource }
  | { type: "fact"; message: string }
  | { type: "guide"; guide: Guide; stats: { sources: number; downgraded: number; seconds: number } }
  | { type: "error"; message: string };

const today = () => new Date().toISOString().slice(0, 10);

function appDomainFrom(query: string): string | undefined {
  const m = query.trim().toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/);
  return m?.[1];
}

const SETUP_PROMPT = (app: string) => `You are researching how a developer registers their OWN OAuth 2.0 app with "${app}" so that their product's end users can connect their ${app} accounts (for example through an integration platform like Composio).
Search the web, preferring ${app}'s official developer documentation. Report concrete facts with the page each came from:
1. Does ${app} offer OAuth 2.0 for third-party apps at all? If it only offers API keys or personal tokens, say so plainly.
2. The developer console URL where the OAuth app is created, and prerequisites (account type, paid plan, admin rights, partner status).
3. Required fields and redirect URI rules (HTTPS required? localhost allowed? exact match? how many?).
4. The scopes or permissions model, listing the main scopes an AI agent would use.
5. Token lifetime and refresh behaviour, and rate limits relevant to an automated agent.
Quote numbers exactly as the source states them. If sources disagree, say so.`;

const REVIEW_PROMPT = (app: string) => `You are researching what stands between a developer's OAuth app for "${app}" and letting ANY external customer connect to it.
Search the web, preferring ${app}'s official developer documentation, then developer forums for real-world experience. Report concrete facts with the page each came from:
1. Is there an app review, verification, security assessment, marketplace listing, partner program or business verification? Which scopes or features trigger it? Is it optional?
2. Before approval, what are the limits (test users, install caps, development mode, rate limits)?
3. Published review durations, quoted exactly, plus any real-world durations developers report (label these as anecdotal).
4. Documents or assets the developer must provide (privacy policy, demo video, company details, test accounts).
5. Common blockers or rejection reasons developers complain about.
Quote numbers exactly. Say "not documented" when you can't find something rather than guessing.`;

const STRUCTURE_PROMPT = (
  app: string,
  setup: string,
  review: string,
  sources: CheckedSource[],
  facts: string[],
) => `Turn the research below into an OAuth readiness guide for "${app}", as one JSON object.

RESEARCH (setup):
${setup}

RESEARCH (review and approval):
${review}

VERIFIED SOURCES (the ONLY urls you may cite):
${sources.map((s) => `${s.id} ${s.url} :: ${s.title}${s.official ? " (official)" : ""}`).join("\n") || "(none)"}

FACTS CHECKED BY CODE (treat as true):
${facts.map((f) => `- ${f}`).join("\n") || "- none"}

RULES
- Audience: a developer building an AI agent who needs their own OAuth app for ${app}. Plain words, short sentences, no em dashes, no marketing tone.
- evidence.kind must be "sourced" or "uncertain". NEVER "tested": nobody tried this setup.
- "sourced" requires "url" copied exactly from VERIFIED SOURCES. If a claim has no verified source, use "uncertain" and put the reason in "note".
- Set "unofficial": true when the source is not ${app}'s own documentation.
- paths: 1 to 3 paths, split only where the scopes an agent needs change the review a developer faces (e.g. read vs send, member vs company). If review is the same for everything, use one path.
- difficulty per path: 1 = minutes, self-serve, no review; 2 = same day, self-serve with a checklist or install cap; 3 = days, light review; 4 = weeks, verification or paid audit; 5 = gated, discretionary partner or business approval with no timeline.
- timeToFirstToken and timeToProduction: short strings. Use the sources' numbers. If unknown, write "Not documented" and make the path evidence "uncertain".
- steps: 5 to 9 steps in order, each with phase "prepare" | "create" | "test" | "production" and who "agent" (an AI agent can do it alone: choosing scopes, drafting text, validating config), "you" (needs the developer: sign-in, payment, legal identity, clicking submit, recording video) or "both". Include a step to register the redirect URI ${COMPOSIO_CALLBACK} (or the value the Composio dashboard shows). Use "paths": [ids] only for steps that apply to some paths.
- gotchas: 2 to 5 real blockers or surprises, each with a "fix" when there is one.
- agentCan / youMust: 3 to 6 short items each.
- uncertain: list conflicts between sources, missing information, and anything you inferred. Be honest; this list is valued.
- If ${app} has no OAuth for third parties, say so in "summary", make one path explaining the alternative (API key, personal token) and keep steps short.
- summary: 2 to 3 sentences: how hard it is, the time to first token versus to production, and the single biggest blocker.

JSON SHAPE
{
 "name": string, "website": string, "category": string, "consoleUrl": string,
 "summary": string,
 "paths": [{ "id": kebab-case string, "label": string, "useCase": string, "scopes": [string], "difficulty": 1-5, "timeToFirstToken": string, "timeToProduction": string, "gate": string, "evidence": Evidence }],
 "steps": [{ "title": string, "detail": string, "who": "agent"|"you"|"both", "phase": string, "paths"?: [string], "evidence": Evidence }],
 "gotchas": [{ "title": string, "detail": string, "fix"?: string, "evidence": Evidence }],
 "agentCan": [string], "youMust": [string], "uncertain": [string]
}
Evidence = { "kind": "sourced"|"uncertain", "url"?: string, "note"?: string, "unofficial"?: boolean }`;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "app";
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Enforce the evidence rules in code rather than trusting the model:
 * no "tested", and every "sourced" claim must cite a URL we actually fetched.
 */
function enforceEvidence(e: Evidence | undefined, allowed: Map<string, CheckedSource>, counter: { n: number }): Evidence {
  const ev: Evidence = e ?? { kind: "uncertain" };
  if (ev.kind === "tested") {
    counter.n++;
    return { ...ev, kind: ev.url && allowed.has(ev.url) ? "sourced" : "uncertain" };
  }
  if (ev.kind === "sourced") {
    const src = ev.url ? allowed.get(ev.url) : undefined;
    if (!src || !src.reachable) {
      counter.n++;
      return { kind: "uncertain", note: [ev.note, "The cited source could not be confirmed, so treat this as unverified."].filter(Boolean).join(" ") };
    }
    return { ...ev, unofficial: ev.unofficial ?? !src.official };
  }
  return ev;
}

export async function* runAgent(query: string): AsyncGenerator<AgentEvent> {
  const started = Date.now();
  const app = query.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const lib = findInLibrary(query);
  if (lib) {
    yield { type: "library", slug: lib.slug };
    return;
  }

  yield { type: "status", step: "composio", message: `Checking Composio's managed OAuth list for "${app}"` };
  const composio = await lookupComposio(app.replace(/\.(com|io|so|ai|dev|app|us)$/, ""));
  const facts: string[] = [];
  let composioEntry: Guide["composio"];
  if (composio.status === "managed") {
    composioEntry = {
      managed: "yes",
      note: `Composio lists ${composio.match.name} under managed OAuth, so you can prototype without your own app. You need this guide when you want your own name on the consent screen, custom scopes or your own rate limits.`,
      evidence: { kind: "sourced", url: MANAGED_AUTH_MD },
    };
    yield { type: "fact", message: `Composio manages OAuth for ${composio.match.name}: you can prototype today.` };
  } else if (composio.status === "byo") {
    composioEntry = {
      managed: "no",
      note: `Composio lists ${composio.match.name} under "Bring your own OAuth app": you must register your own app before your users can connect.`,
      evidence: { kind: "sourced", url: MANAGED_AUTH_MD },
    };
    yield { type: "fact", message: `Composio has no managed app for ${composio.match.name}: you need your own OAuth app.` };
  } else {
    composioEntry = {
      managed: "unknown",
      note:
        composio.status === "unavailable"
          ? "We couldn't load Composio's managed OAuth list just now. Check the toolkit page in Composio."
          : "This app isn't in Composio's OAuth toolkit list, so it may not have an OAuth toolkit yet, or it may use API keys.",
      evidence: composio.status === "unavailable" ? { kind: "uncertain" } : { kind: "sourced", url: MANAGED_AUTH_MD },
    };
    yield { type: "fact", message: composio.status === "unavailable" ? "Couldn't reach Composio's list; continuing." : `"${app}" isn't in Composio's OAuth toolkit list.` };
  }
  if (composio.status === "managed" || composio.status === "byo") facts.push(composioEntry.note);

  yield { type: "status", step: "research", message: "Searching the web: developer docs, review policy and developer reports (2 searches in parallel)" };
  const [setup, review] = await Promise.all([
    generate({ prompt: SETUP_PROMPT(app), search: true }),
    generate({ prompt: REVIEW_PROMPT(app), search: true }),
  ]);
  const queries = [...setup.queries, ...review.queries];
  if (queries.length) yield { type: "fact", message: `Searched: ${queries.slice(0, 6).map((q) => `"${q}"`).join(", ")}` };

  yield { type: "status", step: "verify", message: "Opening every cited page to check it exists" };
  const sources = await checkSources([...setup.chunks, ...review.chunks], appDomainFrom(query));
  for (const s of sources) yield { type: "source", source: s };
  const live = sources.filter((s) => s.reachable);
  if (!live.length) facts.push("No source could be fetched. Every claim must be marked uncertain.");

  yield { type: "status", step: "write", message: "Writing the guide and tagging each claim with its evidence" };
  const structured = await generate({
    prompt: STRUCTURE_PROMPT(app, setup.text, review.text, live, facts),
    json: true,
    temperature: 0.1,
  });

  let draft: Record<string, unknown>;
  try {
    draft = extractJson(structured.text) as Record<string, unknown>;
  } catch {
    yield { type: "status", step: "write", message: "The draft wasn't valid JSON; asking the model to fix it" };
    const retry = await generate({ prompt: STRUCTURE_PROMPT(app, setup.text, review.text, live, facts) + "\n\nReturn ONLY the JSON object.", json: true, temperature: 0 });
    draft = extractJson(retry.text) as Record<string, unknown>;
  }

  const allowed = new Map(live.map((s) => [s.url, s]));
  const counter = { n: 0 };
  const d = draft as Partial<Guide>;
  const guideCandidate = {
    slug: slugify(String(d.name || app)),
    name: String(d.name || app),
    website: d.website,
    category: String(d.category || "App"),
    consoleUrl: d.consoleUrl,
    origin: "generated" as const,
    lastChecked: today(),
    summary: String(d.summary || ""),
    composio: composioEntry,
    paths: (d.paths ?? []).map((p, i) => ({
      id: String(p.id || `path-${i + 1}`),
      label: String(p.label || "Default"),
      useCase: String(p.useCase || ""),
      scopes: Array.isArray(p.scopes) ? p.scopes.map(String) : [],
      difficulty: Math.min(5, Math.max(1, Math.round(Number(p.difficulty) || 3))),
      timeToFirstToken: String(p.timeToFirstToken || "Not documented"),
      timeToProduction: String(p.timeToProduction || "Not documented"),
      gate: String(p.gate || "Not documented"),
      evidence: enforceEvidence(p.evidence, allowed, counter),
    })),
    steps: (d.steps ?? []).map((s) => ({
      title: String(s.title || ""),
      detail: String(s.detail || ""),
      who: (["agent", "you", "both"] as const).includes(s.who) ? s.who : "you",
      phase: (["prepare", "create", "test", "production"] as const).includes(s.phase) ? s.phase : "create",
      paths: Array.isArray(s.paths) && s.paths.length ? s.paths.map(String) : undefined,
      evidence: enforceEvidence(s.evidence, allowed, counter),
    })),
    gotchas: (d.gotchas ?? []).map((g) => ({
      title: String(g.title || ""),
      detail: String(g.detail || ""),
      fix: g.fix ? String(g.fix) : undefined,
      evidence: enforceEvidence(g.evidence, allowed, counter),
    })),
    agentCan: (d.agentCan ?? []).map(String),
    youMust: (d.youMust ?? []).map(String),
    uncertain: (d.uncertain ?? []).map(String),
    sources: live.map((s) => ({ title: s.title, url: s.url, official: s.official })),
  };

  if (guideCandidate.consoleUrl) {
    const probe = await probeConsole(guideCandidate.consoleUrl);
    if (probe?.signIn) {
      guideCandidate.uncertain.push(`Console check: ${guideCandidate.consoleUrl} redirects to a sign-in page, so creating the app needs an account there.`);
    } else if (!probe) {
      guideCandidate.uncertain.push(`Console check: ${guideCandidate.consoleUrl} didn't load from our server; the URL may be wrong.`);
    }
  }
  if (counter.n) guideCandidate.uncertain.push(`${counter.n} claim(s) cited a source we couldn't open, so we downgraded them to Uncertain.`);
  const dropped = sources.length - live.length;
  if (dropped) guideCandidate.uncertain.push(`${dropped} search result(s) couldn't be opened and were not used as sources.`);

  const parsed = Guide.safeParse(guideCandidate);
  if (!parsed.success) {
    console.error("guide validation failed", JSON.stringify(parsed.error.issues).slice(0, 2000));
    yield { type: "error", message: "The agent's guide didn't pass validation. Please try again." };
    return;
  }
  yield {
    type: "guide",
    guide: parsed.data,
    stats: { sources: live.length, downgraded: counter.n, seconds: Math.round((Date.now() - started) / 1000) },
  };
}
