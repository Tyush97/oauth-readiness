import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const AUTHORIZING = "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps";
const CREATING = "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app";
const ORG_RESTRICTIONS =
  "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions";
const RATE_LIMITS = "https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api";
const GITHUB_APPS = "https://docs.github.com/en/apps/using-github-apps/about-using-github-apps";

export const github: Guide = {
  slug: "github",
  name: "GitHub",
  website: "https://github.com",
  category: "Developer tools",
  consoleUrl: "https://github.com/settings/applications/new",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "The easiest provider to get ready. An OAuth App takes about a minute to create, needs no review, and any GitHub user can authorize it immediately. The real decisions are scope breadth (`repo` means every private repo) and whether your customers' organizations will approve third-party apps.",
  composio: {
    managed: "yes",
    note: "Composio has a managed GitHub app, so you can prototype today and switch to your own app when you want your name on the consent screen.",
    evidence: { kind: "sourced", url: "https://docs.composio.dev/toolkits/managed-auth" },
  },
  paths: [
    {
      id: "oauth-app",
      label: "OAuth App",
      useCase: "Act as the user across repos, issues and PRs with classic scopes.",
      scopes: ["repo", "read:user", "read:org"],
      difficulty: 1,
      timeToFirstToken: "About 1 minute to create, 5-10 minutes to a token",
      timeToProduction: "Same day. No review exists.",
      gate: "None from GitHub. Each customer org may need an owner to approve the app.",
      evidence: { kind: "tested", note: "Created on 2026-10-26 in about 20 seconds of form filling; no review step appeared." },
    },
    {
      id: "github-app",
      label: "GitHub App",
      useCase: "Fine-grained, per-repo permissions and a per-installation rate limit. Better for agents that touch customer code.",
      scopes: ["contents:read", "issues:write", "pull_requests:write"],
      difficulty: 2,
      timeToFirstToken: "15-30 minutes (private key, permissions, install)",
      timeToProduction: "Same day. Set installable on 'Any account'.",
      gate: "None from GitHub. Installers choose repos; org owners install or approve.",
      evidence: { kind: "sourced", url: GITHUB_APPS },
    },
  ],
  steps: [
    {
      title: "Decide OAuth App or GitHub App",
      detail:
        "If your agent writes to customer repos, a GitHub App lets the installer pick repositories and grants only the permissions you request. An OAuth App's `repo` scope covers every private repo the user can reach.",
      who: "agent",
      phase: "prepare",
      evidence: { kind: "sourced", url: CREATING },
    },
    {
      title: "Open Settings > Developer settings > New OAuth App",
      detail: "Any personal or organization account works. No paid plan. Up to 100 OAuth apps per owner.",
      who: "you",
      phase: "create",
      paths: ["oauth-app"],
      evidence: { kind: "tested", note: "Personal free account, form at github.com/settings/applications/new." },
    },
    {
      title: "Fill name and homepage, add the redirect URI",
      detail: `Required: application name and homepage URL. Add Composio's callback (${COMPOSIO_CALLBACK}, or the value your Composio dashboard shows) as a redirect URI. You can add up to 10, and \`http://localhost\` works for local testing.`,
      who: "both",
      phase: "create",
      paths: ["oauth-app"],
      evidence: { kind: "tested", note: "Form accepted http://localhost:3000/api/callback and offered up to 10 redirect URIs." },
    },
    {
      title: "Leave wildcard matching off, keep token expiry on",
      detail:
        "New apps match redirect URIs exactly unless you tick 'Allow wildcard matching'. 'Expire user access tokens' is on by default and returns a refresh token (8 h access token, 6 month refresh token). Make sure your integration refreshes.",
      who: "agent",
      phase: "create",
      paths: ["oauth-app"],
      evidence: { kind: "tested", note: "Both options visible on the 2026-10-26 form; expiry pre-ticked." },
    },
    {
      title: "Register, then generate and copy the client secret",
      detail: "The client ID appears immediately. The secret is generated separately and shown once. Paste both into a Composio custom auth config.",
      who: "you",
      phase: "create",
      evidence: { kind: "tested", note: "'Application created successfully' with client ID; secret behind 'Generate a new client secret'." },
    },
    {
      title: "Create the GitHub App instead (if you chose that path)",
      detail:
        "Developer settings > GitHub Apps > New. Name must be unique and at most 34 characters. Untick webhook 'Active' if you don't need events. Choose 'Any account' to let anyone install it, then generate a private key (shown once).",
      who: "you",
      phase: "create",
      paths: ["github-app"],
      evidence: { kind: "sourced", url: "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app" },
    },
    {
      title: "Run one authorization yourself",
      detail:
        "Open the authorize URL with your scopes. The consent screen shows your app name, the scopes in plain words, and trust badges such as 'Created less than a day ago' and 'Fewer than 10 GitHub users'.",
      who: "you",
      phase: "test",
      evidence: { kind: "tested", note: "Consent screen viewed for scope `repo read:user`: 'Repositories: Public and private'." },
    },
    {
      title: "Tell customers about org approval",
      detail:
        "New GitHub organizations have OAuth app access restrictions on by default. A member who authorizes your app can only request access to org repos; an org owner must approve. Put this in your onboarding docs.",
      who: "you",
      phase: "production",
      evidence: { kind: "sourced", url: ORG_RESTRICTIONS },
    },
  ],
  gotchas: [
    {
      title: "Redirect URI not registered",
      detail: "If the redirect URI in the request isn't on the app, users see GitHub's 'Be careful! The redirect_uri is not associated with this application.'",
      fix: "Add the exact Composio callback URL to the app's redirect URIs.",
      evidence: { kind: "tested", note: "Reproduced with an unregistered https callback on 2026-10-26." },
    },
    {
      title: "`repo` is all or nothing",
      detail: "There's no read-only private repo scope for OAuth Apps. The consent screen says 'Public and private', which can scare security-minded customers.",
      fix: "Use a GitHub App with repository selection and read-only permissions where possible.",
      evidence: { kind: "tested", note: "Consent screen for `repo` shows 'Repositories: Public and private'." },
    },
    {
      title: "10 tokens per user, app and scope",
      detail: "Creating an 11th token for the same user, app and scope silently revokes the oldest. Agents that re-authorize in loops or across many environments hit this.",
      fix: "Reuse stored tokens and refresh them instead of re-authorizing.",
      evidence: { kind: "sourced", url: AUTHORIZING },
    },
    {
      title: "Shared rate limit",
      detail: "OAuth App user tokens share the user's 5,000 requests per hour with their other apps. GitHub App installation tokens get their own budget (up to 12,500/h).",
      evidence: { kind: "sourced", url: RATE_LIMITS },
    },
  ],
  agentCan: [
    "Choose OAuth App vs GitHub App from what your agent does",
    "Pick the minimum scopes or permissions for the actions you use",
    "Prefill the name, homepage and redirect URI",
    "Warn about choices that are hard to change (app name, token expiry)",
    "Draft the 'ask your org owner to approve' note for customers",
  ],
  youMust: [
    "Sign in to GitHub (with 2FA) and click Register",
    "Generate and copy the client secret or private key (shown once)",
    "Paste credentials into your Composio auth config",
    "Get an owner's approval in each customer organization",
  ],
  uncertain: [
    "Whether Composio's GitHub toolkit expects OAuth App or GitHub App credentials for a custom auth config.",
  ],
  sources: [
    { title: "Creating an OAuth app", url: CREATING, official: true },
    { title: "Authorizing OAuth apps", url: AUTHORIZING, official: true },
    { title: "About OAuth app access restrictions", url: ORG_RESTRICTIONS, official: true },
    { title: "About using GitHub Apps", url: GITHUB_APPS, official: true },
    { title: "REST API rate limits", url: RATE_LIMITS, official: true },
    { title: "Composio managed auth", url: "https://docs.composio.dev/toolkits/managed-auth", official: true },
  ],
  tested: {
    date: "2026-10-26",
    summary:
      "Created an OAuth App on a free personal account, viewed the consent screen, and triggered the redirect-mismatch error. No secret was generated or stored.",
    corrections: [
      "Many guides say an OAuth App has one callback URL and tokens that never expire. The current form allows up to 10 redirect URIs and turns on token expiry by default.",
    ],
  },
};
