"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Guide } from "@/lib/schema";
import { decodeGuide } from "@/lib/share";
import GuideView from "@/components/GuideView";

export default function SharedPage() {
  const [state, setState] = useState<{ guide: Guide | null; ready: boolean }>({ guide: null, ready: false });

  useEffect(() => {
    setState({ guide: decodeGuide(window.location.hash), ready: true });
  }, []);

  if (!state.ready) return <p className="muted">Loading guide…</p>;
  if (!state.guide)
    return (
      <p>
        This share link is incomplete or damaged. <Link href="/">Look the app up again</Link>.
      </p>
    );
  return <GuideView guide={state.guide} />;
}
