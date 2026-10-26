import { Guide } from "@/lib/schema";
import { github } from "./github";
import { gmail } from "./gmail";
import { slack } from "./slack";
import { notion } from "./notion";
import { instagram } from "./instagram";
import { linkedin } from "./linkedin";
import { hubspot } from "./hubspot";

// Validate the hand-written library against the same schema the agent's output must pass.
export const LIBRARY: Guide[] = [github, gmail, slack, notion, hubspot, linkedin, instagram].map((g) => Guide.parse(g));

const ALIASES: Record<string, string> = {
  "google mail": "gmail",
  google: "gmail",
  "mail.google.com": "gmail",
  "github.com": "github",
  "slack.com": "slack",
  "notion.so": "notion",
  "notion.com": "notion",
  meta: "instagram",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "hubspot.com": "hubspot",
};

export function getGuide(slug: string): Guide | undefined {
  return LIBRARY.find((g) => g.slug === slug);
}

/** Match free text ("Gmail", "https://github.com", "notion.so") to a library guide. */
export function findInLibrary(query: string): Guide | undefined {
  const q = query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!q) return undefined;
  const slug = ALIASES[q] ?? q.replace(/\.(com|io|so|ai|dev|app)$/, "");
  return LIBRARY.find((g) => g.slug === slug || g.name.toLowerCase() === q);
}
