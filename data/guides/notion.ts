import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const PUBLIC = "https://developers.notion.com/guides/get-started/public-connections";
const AUTH = "https://developers.notion.com/guides/get-started/authorization.md";
const MARKETPLACE = "https://developers.notion.com/guides/get-started/marketplace-listing.md";
const REFRESH = "https://developers.notion.com/reference/refresh-a-token";
const LIMITS = "https://developers.notion.com/reference/request-limits";

export const notion: Guide = {
  slug: "notion",
  name: "Notion",
  website: "https://www.notion.so",
  category: "Docs and knowledge",
  consoleUrl: "https://app.notion.com/developers/connections",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "Quick to set up, with one irreversible choice. A public connection works through OAuth without a Marketplace listing. The trap is installation scope: pick 'Selected workspaces only' and you can never list publicly without starting over. Notion's docs are mid-migration, so some requirements are unclear.",
  composio: {
    managed: "yes",
    note: "Composio has a managed Notion app. Its own Notion guide documents the callback URL and HTTPS exact-match rules for custom apps.",
    evidence: { kind: "sourced", url: "https://composio.dev/auth/notion" },
  },
  paths: [
    {
      id: "public",
      label: "Public connection",
      useCase: "Any Notion user authorizes and picks which pages your agent can see.",
      scopes: ["read content", "update content", "insert content"],
      difficulty: 2,
      timeToFirstToken: "10-15 minutes",
      timeToProduction: "Same day, if no review gate applies (see uncertain)",
      gate: "None documented for OAuth use. Marketplace listing is optional.",
      evidence: { kind: "sourced", url: MARKETPLACE },
    },
    {
      id: "listed",
      label: "Listed on Marketplace",
      useCase: "Be discoverable in Notion's Marketplace.",
      scopes: ["read content", "update content", "insert content"],
      difficulty: 3,
      timeToFirstToken: "10-15 minutes",
      timeToProduction: "5-10 business days for listing review",
      gate: "Marketplace listing review",
      evidence: { kind: "sourced", url: MARKETPLACE },
    },
  ],
  steps: [
    {
      title: "Open the developer portal > Public connections > Create",
      detail: "Notion now calls these 'public connections'. Older guides describe notion.so/my-integrations with a 'make public' toggle; you may see either.",
      who: "you",
      phase: "create",
      evidence: { kind: "sourced", url: PUBLIC },
    },
    {
      title: "Choose installation scope: 'Any workspace'",
      detail: "This is set once and can't be changed. Only 'Any workspace' connections can be listed on the Marketplace.",
      who: "agent",
      phase: "create",
      evidence: { kind: "sourced", url: PUBLIC },
    },
    {
      title: "Add the redirect URI and capabilities",
      detail: `Add ${COMPOSIO_CALLBACK} (or your dashboard value), exact match, no trailing slash. Notion has no OAuth scopes; you pick capabilities (read, update, insert, user info).`,
      who: "both",
      phase: "create",
      evidence: { kind: "sourced", url: "https://composio.dev/auth/notion" },
    },
    {
      title: "Prepare company details and legal URLs",
      detail: "Have a company name, website, privacy policy and terms URL ready. Older official flows required them; current pages don't list them.",
      who: "both",
      phase: "prepare",
      evidence: { kind: "uncertain", note: "Third-party guides (n8n, Make, Ampersand) list these; Notion's current pages don't." },
    },
    {
      title: "Authorize from a second workspace",
      detail: "Each user authorizes separately and picks pages in a picker. Test with another workspace to see what your customers see.",
      who: "you",
      phase: "test",
      evidence: { kind: "sourced", url: AUTH },
    },
  ],
  gotchas: [
    {
      title: "Installation scope is permanent",
      detail: "'Installation scope is set once, at creation time, and can't be changed afterward.'",
      fix: "Choose 'Any workspace' unless you're sure.",
      evidence: { kind: "sourced", url: PUBLIC },
    },
    {
      title: "The agent only sees pages the user picked",
      detail: "Users choose pages in a picker, and only pages they have full access to. If they click Allow but abandon the picker, nothing is shared.",
      fix: "Tell users which pages to share during onboarding.",
      evidence: { kind: "sourced", url: AUTH },
    },
    {
      title: "Refresh tokens may be null",
      detail: "Current docs return refresh tokens; older third-party guides say tokens never expire.",
      fix: "Implement refresh but tolerate a null refresh_token.",
      evidence: { kind: "sourced", url: REFRESH },
    },
    {
      title: "Low per-connection rate limit",
      detail: "About 180 requests per minute per connection (600 on Business and Enterprise), plus a per-workspace limit.",
      evidence: { kind: "sourced", url: LIMITS },
    },
  ],
  agentCan: [
    "Pick capabilities for your agent's actions",
    "Explain the installation-scope decision before you commit",
    "Generate the redirect URI list",
    "Draft privacy policy, terms and Marketplace listing copy",
  ],
  youMust: [
    "Sign in and create the connection in the portal",
    "Host legal pages on your domain",
    "Accept developer and Marketplace terms",
    "Copy the client secret",
  ],
  uncertain: [
    "Notion's authorization guide says the Authorization URL appears only after the connection is 'submitted for review', while the Marketplace page says only listings are reviewed. Whether a review gates production OAuth use is unclear.",
    "Whether company name, website and legal URLs are still required for a public connection.",
    "Not tested: we didn't have a Notion account signed in during our setup attempts.",
  ],
  sources: [
    { title: "Public connections", url: PUBLIC, official: true },
    { title: "Authorization", url: AUTH, official: true },
    { title: "Marketplace listing", url: MARKETPLACE, official: true },
    { title: "Refresh a token", url: REFRESH, official: true },
    { title: "Request limits", url: LIMITS, official: true },
    { title: "Composio: Notion custom auth", url: "https://composio.dev/auth/notion", official: true },
    { title: "n8n Notion credentials (older flow)", url: "https://docs.n8n.io/integrations/builtin/credentials/notion/", official: false },
  ],
};
