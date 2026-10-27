"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, ArrowRight, Lightning, CheckCircle } from "@phosphor-icons/react";
import Logo from "./Logo";
import { DifficultyMeter } from "./bits";

export type LibraryEntry = { slug: string; name: string; domain?: string; min: number; max: number; tested: boolean; aliases: string[] };
export type ToolkitEntry = { name: string; managed: boolean };

type Option =
  | { kind: "guide"; entry: LibraryEntry; score: number; hits: number[] }
  | { kind: "live"; name: string; managed?: boolean; score: number; hits: number[] };

/** Subsequence fuzzy match: rewards consecutive and word-start hits. Returns null when not all chars match. */
function fuzzy(query: string, target: string): { score: number; hits: number[] } | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase();
  if (!q) return { score: 0, hits: [] };
  const hits: number[] = [];
  let ti = 0;
  let score = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    const consecutive = hits.length && found === hits[hits.length - 1] + 1;
    const wordStart = found === 0 || /[\s\-_.(]/.test(t[found - 1]);
    score += 1 + (consecutive ? 3 : 0) + (wordStart ? 2 : 0) - Math.min(found - ti, 5) * 0.2;
    hits.push(found);
    ti = found + 1;
  }
  if (t.startsWith(q)) score += 6;
  return { score: score - t.length * 0.02, hits };
}

function Highlight({ text, hits }: { text: string; hits: number[] }) {
  const set = new Set(hits);
  return <>{[...text].map((c, i) => (set.has(i) ? <mark key={i}>{c}</mark> : c))}</>;
}

export default function SearchCombobox({ library, toolkits }: { library: LibraryEntry[]; toolkits: ToolkitEntry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("search")) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const options = useMemo<Option[]>(() => {
    const query = q.trim();
    const guides: Option[] = library
      .map((entry) => {
        const best = [entry.name, ...entry.aliases]
          .map((t, idx) => ({ m: fuzzy(query, t), idx }))
          .filter((x) => x.m)
          .sort((a, b) => b.m!.score - a.m!.score)[0];
        if (!best) return null;
        return { kind: "guide" as const, entry, score: best.m!.score + 4, hits: best.idx === 0 ? best.m!.hits : [] };
      })
      .filter((x): x is Extract<Option, { kind: "guide" }> => !!x)
      .sort((a, b) => b.score - a.score);
    if (!query) return guides;
    const libNames = new Set(library.map((l) => l.name.toLowerCase()));
    const live: Option[] = toolkits
      .filter((t) => !libNames.has(t.name.toLowerCase()))
      .map((t): Option | null => {
        const m = fuzzy(query, t.name);
        return m ? { kind: "live", name: t.name, managed: t.managed, ...m } : null;
      })
      .filter((x): x is Option => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    const exact = [...guides, ...live].some((o) => (o.kind === "guide" ? o.entry.name : o.name).toLowerCase() === query.toLowerCase());
    const typed: Option[] = exact ? [] : [{ kind: "live", name: query, score: -1, hits: [] }];
    return [...guides.slice(0, 5), ...live, ...typed];
  }, [q, library, toolkits]);

  useEffect(() => setActive(0), [q]);

  function go(o: Option | undefined) {
    if (!o) {
      setError("Type an app name or website, e.g. Calendly or zoom.us");
      return;
    }
    setOpen(false);
    if (o.kind === "guide") router.push(`/guides/${o.entry.slug}`);
    else router.push(`/generate?q=${encodeURIComponent(o.name)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (q.trim().length < 2 && !open) return go(undefined);
      go(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const guideCount = options.filter((o) => o.kind === "guide").length;
  return (
    <div className="search-wrap">
      <div className="search-box">
        <MagnifyingGlass size={18} color="var(--faint)" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          aria-label="Search for an app"
          placeholder="Search an app: Gmail, Calendly, zoom.us…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setError("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && options.length > 0 && (
        <div className="menu" role="listbox" id={listId}>
          {options.map((o, i) => {
            const header =
              i === 0 && o.kind === "guide" ? "Ready guides" : i === guideCount && o.kind === "live" ? "Generate live (about 90 seconds)" : null;
            return (
              <div key={o.kind === "guide" ? o.entry.slug : `live-${o.name}-${i}`}>
                {header && <div className="menu-label">{header}</div>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="option"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(o);
                  }}
                >
                  {o.kind === "guide" ? (
                    <>
                      <Logo domain={o.entry.domain} name={o.entry.name} size={26} />
                      <span className="grow">
                        <Highlight text={o.entry.name} hits={o.hits} />
                      </span>
                      {o.entry.tested && <CheckCircle size={15} weight="bold" color="var(--ok)" aria-label="Setup verified" />}
                      <DifficultyMeter value={o.entry.max} />
                    </>
                  ) : (
                    <>
                      <span className="logo logo-fallback" style={{ width: 26, height: 26 }}>
                        <Lightning size={14} weight="fill" aria-hidden="true" />
                      </span>
                      <span className="grow">
                        {o.score === -1 ? <>Research &ldquo;{o.name}&rdquo;</> : <Highlight text={o.name} hits={o.hits} />}
                      </span>
                      {o.managed !== undefined && (
                        <span className="faint">{o.managed ? "Composio-managed" : "Bring your own app"}</span>
                      )}
                      <ArrowRight size={14} color="var(--faint)" aria-hidden="true" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="hint">
          <span>7 apps with ready guides</span>
          <span>Any other app: an agent reads its docs live</span>
        </div>
      )}
    </div>
  );
}
