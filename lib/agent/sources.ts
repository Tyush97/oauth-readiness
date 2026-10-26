export type CheckedSource = {
  id: string;
  title: string;
  url: string;
  /** the agent opened it and got readable text */
  reachable: boolean;
  official: boolean;
};

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
