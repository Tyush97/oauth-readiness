"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Guide } from "@/lib/schema";
import type { AgentEvent } from "@/lib/agent/pipeline";
import GuideView from "@/components/GuideView";
import { shareUrlFor } from "@/lib/share";

type Line = { t: number; text: string; kind: "status" | "fact" | "source" | "error"; ok?: boolean; url?: string };

function Generate() {
  const params = useSearchParams();
  const router = useRouter();
  // Captured once: after the guide arrives we swap the URL to its share link, which drops ?q.
  const [q] = useState(() => params.get("q") ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [shareUrl, setShareUrl] = useState<string>();
  const [stats, setStats] = useState<{ sources: number; downgraded: number; seconds: number }>();
  const [done, setDone] = useState(false);
  const started = useRef(0);
  const ran = useRef<string | null>(null);

  useEffect(() => {
    if (!q || ran.current === q) return;
    ran.current = q;
    started.current = Date.now();
    setLines([]);
    setGuide(null);
    setDone(false);
    const add = (l: Omit<Line, "t">) => setLines((prev) => [...prev, { ...l, t: Math.round((Date.now() - started.current) / 1000) }]);

    (async () => {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed." }));
        add({ kind: "error", text: err.error ?? "Request failed." });
        setDone(true);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const e = JSON.parse(line) as AgentEvent;
          if (e.type === "library") {
            router.replace(`/guides/${e.slug}`);
            return;
          }
          if (e.type === "status") add({ kind: "status", text: e.message });
          if (e.type === "fact") add({ kind: "fact", text: e.message });
          if (e.type === "source") add({ kind: "source", text: e.source.title, ok: e.source.reachable, url: e.source.url });
          if (e.type === "error") add({ kind: "error", text: e.message });
          if (e.type === "guide") {
            const url = shareUrlFor(e.guide, window.location.origin);
            setShareUrl(url);
            setGuide(e.guide);
            setStats(e.stats);
            window.history.replaceState(null, "", url.replace(window.location.origin, ""));
          }
        }
      }
      setDone(true);
    })().catch((err) => {
      add({ kind: "error", text: err instanceof Error ? err.message : "Connection lost." });
      setDone(true);
    });
  }, [q, router]);

  if (!q) {
    return (
      <p>
        No app given. <Link href="/">Search for an app</Link>.
      </p>
    );
  }

  const working = !guide && !done;
  return (
    <>
      <details open={!guide} className="section" style={{ marginTop: 0, marginBottom: 28 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 10 }}>
          {guide
            ? `Agent run: ${stats?.sources ?? 0} sources opened, ${stats?.downgraded ?? 0} claims downgraded, ${stats?.seconds ?? 0}s`
            : `Researching "${q}"`}
        </summary>
        <div className="log" aria-live="polite">
          {lines.map((l, i) => (
            <div className="log-line" key={i}>
              <span className="t">{l.t}s</span>
              {l.kind === "source" ? (
                <span>
                  {l.ok ? "✓ opened" : "✗ couldn't open"}{" "}
                  <a href={l.url} target="_blank" rel="noreferrer">{l.text}</a>
                </span>
              ) : (
                <span style={l.kind === "error" ? { color: "var(--d5)" } : l.kind === "fact" ? { color: "var(--muted)" } : undefined}>
                  {l.kind === "fact" ? "→ " : ""}
                  {l.text}
                </span>
              )}
            </div>
          ))}
          {working && (
            <div className="log-line">
              <span className="t" />
              <span><span className="spinner" /> working…</span>
            </div>
          )}
        </div>
        {done && !guide && (
          <p style={{ marginTop: 12 }}>
            <Link href="/">Back to the library</Link>
          </p>
        )}
      </details>
      {guide && <GuideView guide={guide} shareUrl={shareUrl} />}
    </>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Generate />
    </Suspense>
  );
}
