"use client";

import { useState } from "react";

/** App logo from the site's favicon (works for any domain, including live-generated guides), with a letter fallback. */
export default function Logo({ domain, name, size = 32 }: { domain?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };
  if (!domain || failed) {
    return (
      <span className="logo logo-fallback" style={{ ...box, fontSize: size * 0.45 }} aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  const px = Math.round(size * 0.66);
  return (
    <span className="logo" style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
        alt={`${name} logo`}
        width={px}
        height={px}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
