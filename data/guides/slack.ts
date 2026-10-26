import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const DISTRIBUTION = "https://docs.slack.dev/distribution";
const OAUTH = "https://docs.slack.dev/authentication/installing-with-oauth";
const MANIFEST = "https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests";
const RATE = "https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps";
const RATE_FAQ = "https://api.slack.com/changelog/2025-05-terms-rate-limit-update-and-faq";
const REVIEW = "https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide";
const GUIDELINES = "https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements";
const ROTATION = "https://docs.slack.dev/authentication/using-token-rotation";

export const slack: Guide = {
  slug: "slack",
  name: "Slack",
  website: "https://slack.com",
  category: "Messaging",
  consoleUrl: "https://api.slack.com/apps",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "The most automatable setup (an agent can write the whole app manifest), but the hardest trap for agents. Since 2025, apps distributed outside the Slack Marketplace can read channel history only once a minute, 15 messages at a time. An agent that reads conversations effectively needs Marketplace approval, which requires 10 active workspaces first and up to about 10 weeks of review.",
  composio: {
    managed: "yes",
    note: "Composio has a managed Slack app for prototyping. Check whether its rate limits fit your agent before you depend on it.",
    evidence: { kind: "sourced", url: "https://docs.composio.dev/toolkits/managed-auth" },
  },
  defaultPath: "read-history",
  paths: [
    {
      id: "post",
      label: "Post and respond",
      useCase: "Send messages, reply to mentions, slash commands. Little or no history reading.",
      scopes: ["chat:write", "app_mentions:read", "commands"],
      difficulty: 2,
      timeToFirstToken: "5-20 minutes (5 with a manifest)",
      timeToProduction: "Same day: activate public distribution",
      gate: "Distribution checklist (HTTPS everywhere). No review for unlisted apps.",
      evidence: { kind: "sourced", url: DISTRIBUTION },
    },
    {
      id: "read-history",
      label: "Read conversations",
      useCase: "Summarize channels, search, triage threads. Most agent use cases.",
      scopes: ["channels:history", "groups:history", "search:read"],
      difficulty: 5,
      timeToFirstToken: "5-20 minutes in your own workspace",
      timeToProduction: "Months: reach 10 active workspaces, then up to 10 business days + up to 10 weeks of review",
      gate: "Slack Marketplace approval. Without it, history reads are limited to 1 request per minute.",
      evidence: { kind: "sourced", url: REVIEW },
    },
  ],
  steps: [
    {
      title: "Write an app manifest",
      detail: `Name, bot and user scopes, and oauth_config.redirect_urls including ${COMPOSIO_CALLBACK}. Decide on token rotation now: once enabled it can't be turned off.`,
      who: "agent",
      phase: "prepare",
      evidence: { kind: "sourced", url: MANIFEST },
    },
    {
      title: "Create the app from the manifest",
      detail:
        "api.slack.com/apps > Create New App > From a manifest. An agent can also call apps.manifest.create with an app configuration token you generate once (valid 12 hours).",
      who: "both",
      phase: "create",
      evidence: { kind: "sourced", url: MANIFEST },
    },
    {
      title: "Install to your own workspace and test",
      detail: "Undistributed apps only install on the workspace where they were created. Your workspace may need admin approval for apps.",
      who: "you",
      phase: "test",
      evidence: { kind: "sourced", url: OAUTH },
    },
    {
      title: "Activate public distribution",
      detail: "Manage Distribution > complete the checklist > Activate Public Distribution. All OAuth, event and interaction URLs must be HTTPS. You get a shareable install link.",
      who: "you",
      phase: "production",
      evidence: { kind: "sourced", url: DISTRIBUTION },
    },
    {
      title: "Reach 10 active workspaces, then submit to the Marketplace",
      detail:
        "Active means used in the last 28 days. You need a public landing page, privacy policy, support page with a 2-business-day response, test accounts for reviewers, and a justification for every scope.",
      who: "you",
      phase: "production",
      paths: ["read-history"],
      evidence: { kind: "sourced", url: REVIEW },
    },
  ],
  gotchas: [
    {
      title: "History reads throttled outside the Marketplace",
      detail:
        "conversations.history and conversations.replies are limited to 1 request per minute with at most 15 objects for commercially distributed non-Marketplace apps. New apps since 2025-05-29; existing installs since 2026-03-03.",
      fix: "Get Marketplace approval, or have each customer create an internal app.",
      evidence: { kind: "sourced", url: RATE },
    },
    {
      title: "Redirect URIs must be HTTPS",
      detail: "Slack requires HTTPS for redirect URLs; local testing usually needs a tunnel. Using Composio's callback avoids this.",
      evidence: { kind: "sourced", url: OAUTH },
    },
    {
      title: "Scopes under extra scrutiny",
      detail: "`*:history`, `search:read.*`, `files:read` and `admin.*` get enhanced review. Broad user-token history access 'is unlikely to be approved' without a clear use case.",
      evidence: { kind: "sourced", url: GUIDELINES },
    },
    {
      title: "Token rotation is one-way",
      detail: "With rotation on, access tokens last 12 hours and refresh tokens are single-use. You can't switch rotation off later.",
      evidence: { kind: "sourced", url: ROTATION },
    },
    {
      title: "Approved apps are locked",
      detail: "After Marketplace approval, scope changes need resubmission with a video and a staging app identical to production.",
      evidence: { kind: "sourced", url: REVIEW },
    },
  ],
  agentCan: [
    "Write and validate the full app manifest",
    "Create the app via apps.manifest.create once you provide a config token",
    "Choose scopes and flag ones that trigger enhanced review",
    "Draft scope justifications, landing page, privacy policy and support page",
    "Storyboard the demo video",
  ],
  youMust: [
    "Sign in and generate the app configuration token",
    "Click Activate Public Distribution",
    "Host the legal pages on your domain",
    "Get 10 workspaces actively using the app",
    "Provide test accounts and answer the security questionnaire",
  ],
  uncertain: [
    "Whether the history rate limit applies to apps installed through a platform's managed Slack app in the same way.",
    "Exact Marketplace timelines in practice; Slack gives upper bounds only.",
  ],
  sources: [
    { title: "Distributing your app", url: DISTRIBUTION, official: true },
    { title: "Installing with OAuth", url: OAUTH, official: true },
    { title: "App manifests", url: MANIFEST, official: true },
    { title: "Rate limit changes for non-Marketplace apps", url: RATE, official: true },
    { title: "Rate limit FAQ (dates)", url: RATE_FAQ, official: true },
    { title: "Marketplace review guide", url: REVIEW, official: true },
    { title: "Marketplace guidelines", url: GUIDELINES, official: true },
    { title: "Token rotation", url: ROTATION, official: true },
  ],
};
