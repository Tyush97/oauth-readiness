import type { AgentEvent } from "./pipeline";
import { findInLibrary } from "@/data/guides";
import { MANAGED_AUTH_MD } from "./composio";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Canned run for UI development (MOCK_GENERATION=1). Never used in production. */
export async function* runMock(query: string): AsyncGenerator<AgentEvent> {
  const lib = findInLibrary(query);
  if (lib) {
    yield { type: "library", slug: lib.slug };
    return;
  }
  yield { type: "status", step: "composio", message: `Checking Composio's managed OAuth list for "${query}"` };
  await wait(500);
  yield { type: "fact", message: `Mock: pretending Composio manages ${query}.` };
  yield { type: "status", step: "research", message: "Searching the web (mock)" };
  await wait(1200);
  yield { type: "status", step: "verify", message: "Opening every cited page to check it exists" };
  yield { type: "source", source: { id: "S1", title: "example.com", url: "https://example.com/docs/oauth", reachable: true, official: true } };
  yield { type: "source", source: { id: "S2", title: "forum.example.com", url: "https://forum.example.com/t/1", reachable: false, official: false } };
  await wait(600);
  yield { type: "status", step: "write", message: "Writing the guide (mock)" };
  await wait(800);
  yield {
    type: "guide",
    stats: { sources: 1, downgraded: 1, seconds: 3 },
    guide: {
      slug: "mock",
      name: query,
      category: "Mock",
      origin: "generated",
      lastChecked: new Date().toISOString().slice(0, 10),
      summary: "This is a mock guide used to develop the interface. It contains no real research.",
      composio: { managed: "yes", note: "Mock value.", evidence: { kind: "sourced", url: MANAGED_AUTH_MD } },
      paths: [
        { id: "basic", label: "Basic", useCase: "Mock use case", scopes: ["read"], difficulty: 2, timeToFirstToken: "10 minutes", timeToProduction: "Same day", gate: "None", evidence: { kind: "sourced", url: "https://example.com/docs/oauth" } },
      ],
      steps: [
        { title: "Create the app", detail: "Mock step.", who: "you", phase: "create", evidence: { kind: "sourced", url: "https://example.com/docs/oauth" } },
        { title: "Pick scopes", detail: "Mock step.", who: "agent", phase: "prepare", evidence: { kind: "uncertain", note: "The cited source could not be confirmed." } },
      ],
      gotchas: [{ title: "Mock gotcha", detail: "Mock.", evidence: { kind: "uncertain" } }],
      agentCan: ["Mock"],
      youMust: ["Mock"],
      uncertain: ["Everything: this is a mock."],
      sources: [{ title: "example.com", url: "https://example.com/docs/oauth", official: true }],
    },
  };
}
