import { z } from "zod";

/**
 * How we know a claim. This is the core of the product: every line a developer
 * reads says whether we tried it, read it in a source, or are guessing.
 * - tested:    we did it in the provider console ourselves (library guides only)
 * - sourced:   an official provider doc (or a named third party) says so
 * - uncertain: inferred, conflicting, or not confirmed in a current source
 */
export const EvidenceKind = z.enum(["tested", "sourced", "uncertain"]);
export type EvidenceKind = z.infer<typeof EvidenceKind>;

export const Evidence = z.object({
  kind: EvidenceKind,
  url: z.string().optional(),
  note: z.string().optional(),
  /** true when the source is a vendor blog, forum or third-party guide */
  unofficial: z.boolean().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

/**
 * Difficulty is driven by what the agent needs to do, not by the provider.
 * Gmail send-only and Gmail read are different products from a review point of view,
 * so each guide offers one or more "paths".
 * 1 Minutes: self-serve, no review
 * 2 Same day: self-serve with a checklist or install caps
 * 3 Days: light review (days)
 * 4 Weeks: verification or audit (weeks, may cost money)
 * 5 Gated: discretionary partner/business approval, no timeline
 */
export const Difficulty = z.number().int().min(1).max(5);

export const Path = z.object({
  id: z.string(),
  label: z.string(),
  /** what the agent can do on this path, in plain words */
  useCase: z.string(),
  scopes: z.array(z.string()),
  difficulty: Difficulty,
  timeToFirstToken: z.string(),
  timeToProduction: z.string(),
  /** the review or gate between "my test users" and "anyone" */
  gate: z.string(),
  evidence: Evidence,
});
export type Path = z.infer<typeof Path>;

export const Who = z.enum(["agent", "you", "both"]);
export type Who = z.infer<typeof Who>;

export const Step = z.object({
  title: z.string(),
  detail: z.string(),
  who: Who,
  phase: z.enum(["prepare", "create", "test", "production"]),
  /** path ids this step applies to; empty means all paths */
  paths: z.array(z.string()).optional(),
  evidence: Evidence,
});
export type Step = z.infer<typeof Step>;

export const Gotcha = z.object({
  title: z.string(),
  detail: z.string(),
  fix: z.string().optional(),
  evidence: Evidence,
});
export type Gotcha = z.infer<typeof Gotcha>;

export const Source = z.object({
  title: z.string(),
  url: z.string(),
  official: z.boolean().optional(),
});

export const Guide = z.object({
  slug: z.string(),
  name: z.string(),
  website: z.string().optional(),
  category: z.string(),
  consoleUrl: z.string().optional(),
  origin: z.enum(["library", "generated"]),
  lastChecked: z.string(),
  summary: z.string(),
  composio: z.object({
    managed: z.enum(["yes", "no", "unknown"]),
    note: z.string(),
    evidence: Evidence,
  }),
  paths: z.array(Path).min(1),
  /** path shown first; defaults to the first path */
  defaultPath: z.string().optional(),
  steps: z.array(Step),
  gotchas: z.array(Gotcha),
  agentCan: z.array(z.string()),
  youMust: z.array(z.string()),
  uncertain: z.array(z.string()),
  sources: z.array(Source),
  /** library only: what we found in our own setup attempt */
  tested: z
    .object({
      date: z.string(),
      summary: z.string(),
      corrections: z.array(z.string()),
    })
    .optional(),
});
export type Guide = z.infer<typeof Guide>;

export const DIFFICULTY_LABELS: Record<number, { label: string; hint: string }> = {
  1: { label: "Minutes", hint: "Self-serve, no review" },
  2: { label: "Same day", hint: "Self-serve with a checklist or install cap" },
  3: { label: "Days", hint: "Light review" },
  4: { label: "Weeks", hint: "Verification or paid audit" },
  5: { label: "Gated", hint: "Discretionary approval, no timeline" },
};

/** The redirect URI Composio documents for custom OAuth apps. The dashboard value wins. */
export const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";
