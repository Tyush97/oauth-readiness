import type { GroundingChunk } from "./gemini";

export type CheckedSource = {
  id: string;
  title: string;
  url: string;
  /** we fetched it and got a 2xx/3xx (or a 401/403 from a sign-in wall, which still proves it exists) */
  reachable: boolean;
  official: boolean;
};

/**
 * Gemini's grounding chunks point at vertexaisearch redirect URLs. Resolve each to the
 * real page so citations are readable, and so we can check the page actually exists.
 */
async function resolve(uri: string): Promise<string> {
  if (!uri.includes("grounding-api-redirect")) return uri;
  try {
    const res = await fetch(uri, { redirect: "manual", signal: AbortSignal.timeout(6000) });
    return res.headers.get("location") || uri;
  } catch {
    return uri;
  }
}

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (OAuthReadiness source check)" },
      signal: AbortSignal.timeout(7000),
    });
    return res.status < 400 || res.status === 401 || res.status === 403;
  } catch {
    return false;
  }
}

/** Heuristic: the provider's own domain or a known docs domain counts as official. */
export function isOfficial(url: string, appDomain?: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (appDomain && (host === appDomain || host.endsWith("." + appDomain))) return true;
    const base = appDomain?.split(".").slice(-2, -1)[0];
    return !!base && base.length > 2 && host.includes(base);
  } catch {
    return false;
  }
}

export async function checkSources(chunks: GroundingChunk[], appDomain?: string): Promise<CheckedSource[]> {
  const raw = chunks.map((c) => c.web).filter((w): w is { uri: string; title?: string } => !!w?.uri);
  const resolved = await Promise.all(raw.map(async (w) => ({ title: w.title ?? "", url: await resolve(w.uri) })));
  const seen = new Set<string>();
  const unique = resolved.filter((s) => {
    const k = s.url.replace(/[#?].*$/, "").replace(/\/$/, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 14);
  const checks = await Promise.all(unique.map((s) => reachable(s.url)));
  return unique.map((s, i) => ({
    id: `S${i + 1}`,
    title: s.title || new URL(s.url).hostname,
    url: s.url,
    reachable: checks[i],
    official: isOfficial(s.url, appDomain),
  }));
}

/** "Attempt" the first step: does the developer console load, or does it demand a sign-in? */
export async function probeConsole(url: string): Promise<{ ok: boolean; signIn: boolean; finalUrl: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "user-agent": "Mozilla/5.0" } });
    const finalUrl = res.url || url;
    const signIn = /login|signin|sign-in|auth|accounts\./i.test(new URL(finalUrl).pathname + new URL(finalUrl).hostname) && finalUrl !== url;
    return { ok: res.status < 500, signIn, finalUrl };
  } catch {
    return null;
  }
}
