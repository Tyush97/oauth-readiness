/**
 * Ground truth for "does Composio manage this app?" comes from Composio's own docs,
 * not from the model. We read the Markdown version of the managed-auth page and
 * look the app up in its two tables.
 */
export const MANAGED_AUTH_MD = "https://docs.composio.dev/toolkits/managed-auth.md";

type Entry = { name: string; slug: string };
type Tables = { managed: Entry[]; byo: Entry[] };

let cache: { at: number; tables: Tables } | null = null;

function parseTables(md: string): Tables {
  const managed: Entry[] = [];
  const byo: Entry[] = [];
  let bucket: Entry[] | null = null;
  for (const line of md.split("\n")) {
    if (/^##\s+Composio-managed/i.test(line)) bucket = managed;
    else if (/^##\s+Bring your own/i.test(line)) bucket = byo;
    else if (/^##\s/.test(line)) bucket = null;
    const row = line.match(/^\|\s*\[([^\]]+)\]\([^)]*\)\s*\|\s*`([^`]+)`/);
    if (bucket && row) bucket.push({ name: row[1].trim(), slug: row[2].trim() });
  }
  return { managed, byo };
}

async function getTables(): Promise<Tables | null> {
  if (cache && Date.now() - cache.at < 6 * 3600_000) return cache.tables;
  try {
    const res = await fetch(MANAGED_AUTH_MD, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const tables = parseTables(await res.text());
    if (!tables.managed.length) return null;
    cache = { at: Date.now(), tables };
    return tables;
  } catch {
    return null;
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ComposioLookup =
  | { status: "managed" | "byo"; match: Entry; related: Entry[] }
  | { status: "not-listed" }
  | { status: "unavailable" };

export async function lookupComposio(appName: string): Promise<ComposioLookup> {
  const tables = await getTables();
  if (!tables) return { status: "unavailable" };
  const q = norm(appName);
  const exact = (list: Entry[]) => list.find((e) => norm(e.name) === q || norm(e.slug) === q);
  const related = [...tables.managed, ...tables.byo].filter((e) => norm(e.name).startsWith(q) && norm(e.name) !== q).slice(0, 4);
  const m = exact(tables.managed);
  if (m) return { status: "managed", match: m, related };
  const b = exact(tables.byo);
  if (b) return { status: "byo", match: b, related };
  return { status: "not-listed" };
}
