"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Exact slugs go straight to the library; anything else goes to /generate, which also resolves aliases (e.g. "notion.so"). */
export default function SearchBox({ librarySlugs }: { librarySlugs: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (value.length < 2) {
      setError("Enter an app name or website, e.g. Calendly or calendly.com");
      return;
    }
    const slug = value.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\.(com|so|io)\/?$/, "");
    if (librarySlugs.includes(slug)) router.push(`/guides/${slug}`);
    else router.push(`/generate?q=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={submit}>
      <div className="search">
        <input
          aria-label="App name or website"
          placeholder="App name or website, e.g. Calendly, zoom.us, Salesforce"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setError("");
          }}
        />
        <button className="btn" type="submit">Get guide</button>
      </div>
      {error ? <div className="error">{error}</div> : <div className="faint">In the library: instant. Anything else: an agent reads the provider&apos;s docs live (1-2 minutes).</div>}
    </form>
  );
}
