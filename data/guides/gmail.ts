import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const SCOPES = "https://developers.google.com/workspace/gmail/api/auth/scopes";
const SENSITIVE = "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification";
const RESTRICTED = "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification";
const AUDIENCE = "https://support.google.com/cloud/answer/15549945";
const BRAND = "https://support.google.com/cloud/answer/13464321";
const CASA = "https://support.google.com/cloud/answer/13465431";
const VIDEO = "https://support.google.com/cloud/answer/13804565";
const WEB_SERVER = "https://developers.google.com/identity/protocols/oauth2/web-server";

export const gmail: Guide = {
  slug: "gmail",
  name: "Gmail",
  website: "https://mail.google.com",
  category: "Email",
  consoleUrl: "https://console.cloud.google.com/auth/overview",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "Easy to start, hard to launch. You can have a working token in about 10 minutes, but only for test users you add by hand. Reading mail in any form (even headers only) uses a restricted scope, which means Google verification plus a paid annual security assessment. A send-only or labels-only agent avoids most of that.",
  composio: {
    managed: "yes",
    note: "Composio's managed Gmail app lets you prototype and demo without any Google review. Move to your own app when customers need your name on the consent screen.",
    evidence: { kind: "sourced", url: "https://docs.composio.dev/toolkits/managed-auth" },
  },
  defaultPath: "read",
  paths: [
    {
      id: "labels",
      label: "Labels only",
      useCase: "Create and apply labels. No access to message content.",
      scopes: ["gmail.labels"],
      difficulty: 2,
      timeToFirstToken: "About 10 minutes",
      timeToProduction: "Minutes to 3 business days (brand verification)",
      gate: "Brand verification: verified domain, homepage and privacy policy.",
      evidence: { kind: "tested", note: "Google's console lists gmail.labels as non-sensitive (2026-10-26)." },
    },
    {
      id: "send",
      label: "Send only",
      useCase: "Send email as the user. Can't read the inbox.",
      scopes: ["gmail.send"],
      difficulty: 3,
      timeToFirstToken: "About 10 minutes",
      timeToProduction: "About 3-5 business days after you submit",
      gate: "Sensitive-scope verification: justification and demo video. No security audit.",
      evidence: { kind: "tested", note: "Console lists gmail.send as sensitive; Google states 3-5 business days.", url: SENSITIVE },
    },
    {
      id: "read",
      label: "Read or manage mail",
      useCase: "Read, triage, draft, label or archive mail. Most email agents need this.",
      scopes: ["gmail.readonly", "gmail.modify", "gmail.metadata", "gmail.compose"],
      difficulty: 4,
      timeToFirstToken: "About 10 minutes (test users only)",
      timeToProduction: "Several weeks (often 3-8), then yearly renewal",
      gate: "Restricted-scope verification plus a CASA security assessment paid to a third-party lab (roughly $500-$4,500 a year).",
      evidence: {
        kind: "tested",
        note: "Console lists readonly, modify, metadata and full access as restricted. Durations and cost are sourced: Google says 'several weeks'; the cost range is from Google's Health API page and vendor quotes.",
        url: RESTRICTED,
      },
    },
  ],
  steps: [
    {
      title: "Pick the narrowest scope first",
      detail:
        "Your scope decides your review, so choose it before anything else. `gmail.metadata` sounds light but is restricted. If the agent only sends, use `gmail.send`. If it only organizes, use `gmail.labels`.",
      who: "agent",
      phase: "prepare",
      evidence: { kind: "tested", note: "Classification read from the console's Data Access page on 2026-10-26.", url: SCOPES },
    },
    {
      title: "Create a separate Google Cloud project",
      detail:
        "Use a dedicated project for this app. The 100-user cap before verification counts over the project's lifetime and can't be reset, so don't burn it on experiments in your production project.",
      who: "you",
      phase: "create",
      evidence: { kind: "sourced", url: AUDIENCE },
    },
    {
      title: "Run the Google Auth Platform wizard",
      detail:
        "App name, user support email, audience (External), developer contact email, then tick 'I agree to the Google API Services: User Data Policy'. No domain or privacy policy is needed yet. 'Internal' (no verification) is only available if you have a Google Workspace organization.",
      who: "you",
      phase: "create",
      evidence: { kind: "tested", note: "Wizard completed on a personal account; 'Make internal' was disabled without a Workspace org." },
    },
    {
      title: "Add scopes on the Data Access page",
      detail:
        "Paste the scopes. The page sorts them into non-sensitive, sensitive and restricted, which is Google's authoritative classification for your project.",
      who: "both",
      phase: "create",
      evidence: { kind: "tested" },
    },
    {
      title: "Create a Web client with Composio's redirect URI",
      detail: `Clients > Create > Web application. Add ${COMPOSIO_CALLBACK} (or your dashboard's value). With sensitive scopes, non-localhost redirects must be https. Leave 'Use this client for an AI-powered agent' unticked unless you use Google's MCP tools. Copy the secret now, as it's shown in a one-time dialog.`,
      who: "you",
      phase: "create",
      evidence: { kind: "tested", note: "An http://example.com redirect was rejected: 'You are using a sensitive scope. URI must use https://'. Changes can take 5 minutes to a few hours." },
    },
    {
      title: "Add yourself and your testers as test users",
      detail: "In Testing mode even the app's creator is blocked until listed as a test user. Up to 100 test users.",
      who: "you",
      phase: "test",
      evidence: { kind: "tested", note: "Before adding: 'Access blocked ... Error 403: access_denied'. After: the 'Google hasn't verified this app' warning, then consent." },
    },
    {
      title: "Plan for 7-day refresh tokens while testing",
      detail: "In Testing mode, refresh tokens for sensitive or restricted scopes expire after 7 days. Long-running agents will silently lose access during a pilot.",
      who: "agent",
      phase: "test",
      evidence: { kind: "sourced", url: AUDIENCE },
    },
    {
      title: "Verify your domain and finish Branding",
      detail:
        "Homepage and privacy policy on a domain you own, verified in Google Search Console. The privacy policy needs Google's Limited Use statement. Uploading a logo itself triggers verification.",
      who: "you",
      phase: "production",
      evidence: { kind: "sourced", url: BRAND },
    },
    {
      title: "Write scope justifications and record the demo video",
      detail:
        "For each sensitive or restricted scope: why you need it, and a video showing the full OAuth flow (consent screen in English) and each feature that uses the scope. YouTube, Drive or any accessible link.",
      who: "both",
      phase: "production",
      paths: ["send", "read"],
      evidence: { kind: "sourced", url: VIDEO },
    },
    {
      title: "Book a CASA security assessment",
      detail:
        "Restricted scopes need a lab-tested assessment by a Google-approved assessor, paid by you and renewed every 12 months. Start early: practitioners report 5-20 days for the assessment alone.",
      who: "you",
      phase: "production",
      paths: ["read"],
      evidence: { kind: "sourced", url: CASA },
    },
  ],
  gotchas: [
    {
      title: "Access blocked, even for you",
      detail: "'Access blocked: <app> has not completed the Google verification process. Error 403: access_denied' appears for anyone not on the test user list, including the developer.",
      fix: "Add the account under Audience > Test users.",
      evidence: { kind: "tested" },
    },
    {
      title: "`gmail.metadata` is restricted",
      detail: "Headers-only access feels lightweight but Google treats it like full read access.",
      evidence: { kind: "tested", url: SCOPES },
    },
    {
      title: "Lifetime 100-user cap",
      detail: "Unverified apps with sensitive or restricted scopes can only ever authorize 100 users per project.",
      fix: "Verify before a public launch; use a separate dev project.",
      evidence: { kind: "sourced", url: AUDIENCE },
    },
    {
      title: "redirect_uri_mismatch",
      detail: "Google matches scheme, case and trailing slash exactly. No wildcards or fragments.",
      evidence: { kind: "sourced", url: WEB_SERVER },
    },
    {
      title: "Verification can stall",
      detail: "Google's guidance is 'several weeks' for restricted scopes, but developers report cases stuck for months without a first email.",
      evidence: { kind: "sourced", unofficial: true, url: "https://discuss.google.dev/t/oauth-verification-pending-since-22-apr-2026-first-trust-safety-email-never-received/392005" },
    },
  ],
  agentCan: [
    "Map your agent's actions to the lowest scope tier that covers them",
    "Draft the privacy policy with the Limited Use statement",
    "Write a justification for each scope",
    "Script the demo video shot by shot",
    "Check that homepage and privacy policy resolve on the same verified domain",
    "Validate redirect URIs against Google's rules",
  ],
  youMust: [
    "Own the Google account and accept the User Data Policy",
    "Add test users",
    "Verify the domain in Search Console (DNS access)",
    "Record the demo video on the real app and click Submit",
    "Pay and work with the CASA assessor, every year",
    "Answer Google Trust & Safety emails",
  ],
  uncertain: [
    "CASA cost for Gmail specifically. Google publishes $500-$4,500 on its Health API page; vendors quote $540 to $6,000.",
    "What 'Use this client for an AI-powered agent' changes for review. It's new in the console and we found no documentation beyond the tooltip.",
  ],
  sources: [
    { title: "Gmail API scopes", url: SCOPES, official: true },
    { title: "Sensitive scope verification", url: SENSITIVE, official: true },
    { title: "Restricted scope verification", url: RESTRICTED, official: true },
    { title: "Manage app audience", url: AUDIENCE, official: true },
    { title: "Brand verification", url: BRAND, official: true },
    { title: "Security assessment (CASA)", url: CASA, official: true },
    { title: "Demo video requirements", url: VIDEO, official: true },
    { title: "OAuth 2.0 for web server apps", url: WEB_SERVER, official: true },
    { title: "Nango: Google security review notes", url: "https://nango.dev/docs/api-integrations/google-shared/google-security-review", official: false },
  ],
  tested: {
    date: "2026-10-26",
    summary:
      "Created a project, consent screen and web client on a personal Google account. Classified 9 Gmail, Calendar and Drive scopes in the console, tested redirect validation, hit the 403 block, then reached the consent screen as a test user. Stopped before granting access.",
    corrections: [
      "A vendor guide lists `calendar.events` as restricted. Google's console classifies it as sensitive.",
      "Found a new client option, 'Use this client for an AI-powered agent', that none of our sources mention.",
    ],
  },
};
