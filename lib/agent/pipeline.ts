import { Guide, COMPOSIO_CALLBACK, type Evidence } from "@/lib/schema";
import { findInLibrary } from "@/data/guides";
import { generate } from "./gemini";
import { isOfficial, probeConsole, type CheckedSource } from "./sources";
import { excerpt, pickRelevant, readPage, type Page } from "./reader";
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

const PLAN_PROMPT = (app: string) => `A developer wants to register their own OAuth 2.0 app with "${app}" so their product's users can connect ${app} accounts.
From your knowledge, say where the official developer documentation lives. Return JSON only:
{
  "name": official product name,
  "website": main website URL,
  "docsHosts": [up to 3 hostnames of official developer docs, e.g. "developer.example.com"],
  "candidateUrls": [up to 6 official doc page URLs most likely to cover: creating an OAuth app, scopes, redirect URIs, app review / marketplace / publishing / verification, rate limits],
  "consoleUrl": URL where developers create the app, or "",
  "category": short category like "Scheduling" or "CRM"
}
Use only official ${app} domains. It's fine to guess URLs; they will be checked.`;

const STRUCTURE_PROMPT = (
  app: string,
  pages: { id: string; url: string; title: string; text: string }[],
  facts: string[],
) => `Write an OAuth readiness guide for "${app}" as one JSON object, using ONLY the documentation pages below, which the agent opened and read just now.

PAGES (the ONLY urls you may cite)
${pages.map((p) => `=== ${p.id} ${p.url}\nTitle: ${p.title}\n${p.text}`).join("\n\n") || "(no pages could be read)"}

FACTS CHECKED BY CODE (treat as true):
${facts.map((f) => `- ${f}`).join("\n") || "- none"}

RULES
- Audience: a developer building an AI agent who needs their own OAuth app for ${app}. Plain words, short sentences, no em dashes, no marketing tone.
- evidence.kind must be "sourced" or "uncertain". NEVER "tested": nobody tried this setup.
- "sourced" requires "url" copied exactly from a PAGES header, and the page must actually support the claim. If no page supports a claim, use "uncertain" and say why in "note" (you may still include well-known facts this way).
- Set "unofficial": true when the source is not ${app}'s own documentation.
- paths: 1 to 3 paths, split only where the scopes an agent needs change the review a developer faces (e.g. read vs send, member vs company). If review is the same for everything, use one path.
- difficulty per path: 1 = minutes, self-serve, no review; 2 = same day, self-serve with a checklist or install cap; 3 = days, light review; 4 = weeks, verification or paid audit; 5 = gated, discretionary partner or business approval with no timeline.
- timeToFirstToken and timeToProduction: short strings. Use numbers stated on the pages. If the pages state no review duration, write e.g. "No review documented" or "Not documented" and say so; never invent a duration.
- steps: 5 to 9 steps in order, each with phase "prepare" | "create" | "test" | "production" and who "agent" (an AI agent can do it alone: choosing scopes, drafting text, validating config), "you" (needs the developer: sign-in, payment, legal identity, clicking submit, recording video) or "both". Include a step to register the redirect URI ${COMPOSIO_CALLBACK} (or the value the Composio dashboard shows). Use "paths": [ids] only for steps that apply to some paths.
- Scope of the guide: getting the OAuth APP ready (account, registration, configuration, scopes, testing, review/approval, limits). Do NOT write steps for implementing the OAuth flow in code (PKCE, token exchange, refresh calls): Composio handles those. "agent" steps are things like choosing scopes, preparing app settings, drafting policy or review text, checking redirect URIs.
- gotchas: 2 to 5 real blockers or surprises, each with a "fix" when there is one.
- agentCan / youMust: 3 to 6 short items each.
- uncertain: list conflicts between sources, missing information, and anything you inferred. Be honest; this list is valued.
- If ${app} has no OAuth for third parties, say so in "summary", make one path explaining the alternative (API key, personal token) and keep steps short.
- summary: 2 to 3 sentences: how hard it is, the time to first token versus to production, and the single biggest blocker.

JSON SHAPE
{
 "name": string, "website": string, "category": string, "consoleUrl": string,
 "summary": string,
 "paths": [{ "id": kebab-case string, "label": string, "useCase": string, "scopes": [string], "difficulty": 1-5, "timeToFirstToken": string, "timeToProduction": string, "gate": string, "launchDays": number of days from a working app to "any user can connect" (0 = same day) or null if gated with no timeline, "evidence": Evidence }],
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

  yield { type: "status", step: "plan", message: "Looking for the official developer docs" };
  // Ask the model where the docs live, but don't wait for it if a docs index turns up first.
  type Plan = { name?: string; website?: string; docsHosts?: string[]; candidateUrls?: string[]; consoleUrl?: string; category?: string };
  const planPromise: Promise<Plan> = generate({ prompt: PLAN_PROMPT(app), json: true, temperature: 0, prefer: "fast", timeoutMs: 40_000 })
    .then((r) => extractJson(r.text) as Plan)
    .catch(() => ({}));
  const guessDomain = appDomainFrom(query) ?? `${app.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const hostsFor = (domain: string, extra: string[] = []) =>
    [...new Set([...extra, `developer.${domain}`, `developers.${domain}`, `docs.${domain}`].map((h) => h.replace(/^https?:\/\//, "").replace(/\/.*$/, "")))].slice(0, 5);

  const read: Page[] = [];
  const tried = new Set<string>();
  const MAX_PAGES = 8;
  const indexLinks: { text: string; url: string }[] = [];
  const seenIndexes = new Set<string>(); // developer./developers./docs. often redirect to one site
  const probeIndexes = async function* (hosts: string[]) {
    const results = await Promise.all(hosts.map((h) => readPage(`https://${h}/llms.txt`).then((p) => ({ h, p }))));
    for (const { h, p } of results) {
      tried.add(`https://${h}/llms.txt`);
      const sig = p.text.slice(0, 200);
      if (p.ok && p.via === "direct" && /\]\(https?:/.test(p.text) && !seenIndexes.has(sig)) {
        seenIndexes.add(sig);
        indexLinks.push(...p.links);
        yield `Found a docs index at https://${h}/llms.txt (${p.links.length} pages listed)`;
      }
    }
  };

  let hosts = hostsFor(guessDomain);
  for await (const m of probeIndexes(hosts)) yield { type: "fact", message: m };
  let plan: Plan = {};
  if (pickRelevant(indexLinks, hosts, 3, tried).length < 3) {
    yield { type: "status", step: "plan", message: "No docs index at the obvious addresses; asking the model where the docs live" };
    plan = await planPromise;
    const domain = appDomainFrom(plan.website ?? "") ?? guessDomain;
    const more = hostsFor(domain, plan.docsHosts ?? []).filter((h) => !hosts.includes(h));
    hosts = [...hosts, ...more];
    if (more.length) yield { type: "fact", message: `Docs likely at: ${more.slice(0, 3).join(", ")}` };
    for await (const m of probeIndexes(more.slice(0, 3))) yield { type: "fact", message: m };
  }
  const domain = appDomainFrom(plan.website ?? "") ?? guessDomain;

  yield { type: "status", step: "read", message: "Reading the pages about OAuth apps, scopes and review" };
  // 2. Candidate pages: relevant index entries first, then the model's guesses.
  const reviewLinks = pickRelevant(indexLinks.filter((l) => /review|publish|submi|marketplace|distribut|verif|listing|partner/i.test(`${l.text} ${l.url}`)), hosts, 3, tried);
  const queue = [
    ...reviewLinks.map((l) => l.url),
    ...pickRelevant(indexLinks, hosts, 6, tried).map((l) => l.url),
    ...(plan.candidateUrls ?? []).filter((u) => /^https?:\/\//.test(u)),
  ];
  while (queue.length && read.length < MAX_PAGES) {
    const url = queue.shift()!;
    if (tried.has(url)) continue;
    tried.add(url);
    const page = await readPage(url);
    yield { type: "source", source: { id: "", title: page.ok ? page.title : url, url: page.url, reachable: page.ok, official: true } };
    if (!page.ok) continue;
    read.push(page);
    // 3. Follow relevant links one level deep while we still have room.
    if (read.length < MAX_PAGES) queue.push(...pickRelevant(page.links, hosts, 3, tried).map((l) => l.url));
  }
  if (!read.length) facts.push("No documentation page could be read. Mark every claim uncertain and say the docs couldn't be reached.");

  const pages = read.map((p, i) => ({ id: `S${i + 1}`, url: p.url, title: p.title, text: excerpt(p.text, 5500) }));
  const live: CheckedSource[] = pages.map((p) => ({ id: p.id, title: p.title, url: p.url, reachable: true, official: isOfficial(p.url, domain) }));

  yield { type: "status", step: "write", message: `Writing the guide from ${pages.length} pages and tagging each claim with its evidence` };
  const prompt = STRUCTURE_PROMPT(plan.name || app.replace(/\.(com|io|so|ai|dev|app|us)$/, ""), pages, facts);
  let draft: Record<string, unknown>;
  try {
    draft = extractJson((await generate({ prompt, json: true, temperature: 0.1, prefer: "best", timeoutMs: 75_000 })).text) as Record<string, unknown>;
  } catch {
    yield { type: "status", step: "write", message: "The draft wasn't valid JSON; asking the model to fix it" };
    draft = extractJson((await generate({ prompt: prompt + "\n\nReturn ONLY the JSON object.", json: true, temperature: 0, prefer: "fast", timeoutMs: 90_000 })).text) as Record<string, unknown>;
  }
  if (!draft.consoleUrl && plan.consoleUrl) draft.consoleUrl = plan.consoleUrl;
  if (!draft.category && plan.category) draft.category = plan.category;
  const sources = read;

  const allowed = new Map(live.map((s) => [s.url, s]));
  const counter = { n: 0 };
  const d = draft as Partial<Guide>;
  const guideCandidate = {
    slug: slugify(String(d.name || app)),
    name: String(d.name || app),
    website: d.website,
    domain: appDomainFrom(String(d.website || "")) ?? domain,
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
      launchDays: p.launchDays === null ? null : Number.isFinite(Number(p.launchDays)) ? Math.max(0, Number(p.launchDays)) : undefined,
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
  const dropped = tried.size - sources.length;
  if (dropped > 0) guideCandidate.uncertain.push(`The agent tried ${tried.size} URLs and could read ${sources.length}; the rest were missing or unreadable and were not used.`);
  guideCandidate.uncertain.push("This guide is built from official documentation only. It doesn't include developer forum reports, so real-world review times may be longer than documented.");

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
