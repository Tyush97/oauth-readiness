/**
 * The agent's eyes. Instead of trusting search snippets, it opens real pages:
 * 1. the docs site's llms.txt index (common on developer docs in 2026) to find the right pages,
 * 2. the pages themselves, falling back to a reader service for JavaScript-rendered sites.
 * A guide may only cite pages that came back from here with readable text.
 */

export type Page = { url: string; ok: boolean; title: string; text: string; links: { text: string; url: string }[]; via: "direct" | "reader" | "none" };

const UA = "Mozilla/5.0 (compatible; OAuthReadiness/1.0; +research for developer setup guides)";
const RELEVANT =
  /oauth|authori[sz]|auth(entication)?\b|scope|permission|app.?review|review|marketplace|publish|distribut|verif|partner|listing|rate.?limit|token|redirect|client.?id|register|create.?(an?|your).?app|developer.?app|security/i;

function stripHtml(html: string): { title: string; text: string; links: { text: string; url: string }[] } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const links: { text: string; url: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    links.push({ url: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
  }
  const text = html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { title, text, links };
}

function mdLinks(md: string) {
  return [...md.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => ({ text: m[1], url: m[2] }));
}

function absolutize(base: string, links: { text: string; url: string }[]) {
  return links
    .map((l) => {
      try {
        return { text: l.text, url: new URL(l.url, base).toString() };
      } catch {
        return null;
      }
    })
    .filter((l): l is { text: string; url: string } => !!l && l.url.startsWith("http"));
}

async function viaReader(url: string): Promise<Page | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers: { "user-agent": UA, accept: "text/plain" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const md = await res.text();
    const title = md.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? new URL(url).hostname;
    const body = md.split(/Markdown Content:\s*/)[1] ?? md;
    if (body.trim().length < 300) return null;
    return { url, ok: true, title, text: body.trim(), links: mdLinks(body), via: "reader" };
  } catch {
    return null;
  }
}

export async function readPage(url: string): Promise<Page> {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA }, signal: AbortSignal.timeout(15000) });
    const type = res.headers.get("content-type") ?? "";
    if (res.ok) {
      const raw = await res.text();
      if (/text\/(plain|markdown)/.test(type) || /\.(md|txt)$/.test(new URL(res.url || url).pathname)) {
        if (raw.trim().length > 200) {
          const title = raw.match(/^#\s+(.+)$/m)?.[1] ?? new URL(url).pathname;
          return { url: res.url || url, ok: true, title, text: raw, links: mdLinks(raw), via: "direct" };
        }
      } else {
        const p = stripHtml(raw);
        if (p.text.length > 800) return { url: res.url || url, ok: true, title: p.title || url, text: p.text, links: absolutize(res.url || url, p.links), via: "direct" };
      }
    }
  } catch {
    /* fall through to the reader */
  }
  // Some indexes list `.md` twins that time out or don't exist; try the normal page once.
  if (/\.md$/.test(url) && !url.endsWith("/llms.md")) {
    const html = await readPage(url.replace(/\.md$/, ""));
    if (html.ok) return html;
  }
  const r = await viaReader(url);
  return r ?? { url, ok: false, title: url, text: "", links: [], via: "none" };
}

/** Score a link for "would this page help a developer get an OAuth app approved?" */
function score(l: { text: string; url: string }) {
  const s = `${l.text} ${l.url}`;
  let n = 0;
  if (/oauth/i.test(s)) n += 4;
  if (/scope|permission/i.test(s)) n += 3;
  if (/review|marketplace|publish|distribut|verif|listing|partner|submi/i.test(s)) n += 4;
  if (/auth/i.test(s)) n += 2;
  if (/rate.?limit/i.test(s)) n += 2;
  if (/token|redirect|register|create|getting.?started/i.test(s)) n += 1;
  // Prefer narrative guides over API reference pages for individual endpoints.
  if (/api-docs\/|\/reference\/|\/(get|post|put|patch|delete)-|introspect|revoke/i.test(s)) n -= 3;
  if (/changelog|blog|release|webhook|sdk|example|tutorial\/\d|status/i.test(s)) n -= 2;
  return n;
}

export function pickRelevant(links: { text: string; url: string }[], hosts: string[], limit: number, exclude: Set<string>) {
  const seen = new Set<string>();
  return links
    .filter((l) => {
      try {
        const h = new URL(l.url).hostname;
        return hosts.some((x) => h === x || h.endsWith("." + x.replace(/^(developers?|docs|api)\./, "")));
      } catch {
        return false;
      }
    })
    .filter((l) => RELEVANT.test(`${l.text} ${l.url}`))
    .map((l) => ({ ...l, url: l.url.replace(/#.*$/, ""), s: score(l) }))
    .filter((l) => l.s > 0 && !exclude.has(l.url) && !seen.has(l.url) && (seen.add(l.url), true))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
}

/** Keep the parts of a long page that talk about OAuth and review, within a character budget. */
export function excerpt(text: string, budget = 6000) {
  if (text.length <= budget) return text;
  const paras = text.split(/\n+/);
  const keep = paras.map((p, i) => ({ p, i, hit: RELEVANT.test(p) }));
  const chosen = new Set<number>();
  for (const k of keep) if (k.hit) [k.i - 1, k.i, k.i + 1].forEach((j) => j >= 0 && j < paras.length && chosen.add(j));
  let out = "";
  for (const i of [...chosen].sort((a, b) => a - b)) {
    if (out.length + paras[i].length > budget) break;
    out += paras[i] + "\n";
  }
  return out.length > 500 ? out : text.slice(0, budget);
}
