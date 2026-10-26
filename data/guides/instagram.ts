import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const OVERVIEW = "https://developers.facebook.com/docs/instagram-platform/overview";
const ACCESS = "https://developers.facebook.com/docs/graph-api/overview/access-levels/";
const MODES = "https://developers.facebook.com/docs/development/build-and-test/app-modes";
const BV = "https://developers.facebook.com/docs/development/release/business-verification";
const SUBMIT = "https://developers.facebook.com/docs/app-review/submission-guide";
const DUC = "https://developers.facebook.com/docs/development/maintaining-data-access/data-use-checkup";
const SECURITY = "https://developers.facebook.com/docs/facebook-login/security";

export const instagram: Guide = {
  slug: "instagram",
  name: "Instagram (Meta)",
  website: "https://www.instagram.com",
  category: "Social",
  consoleUrl: "https://developers.facebook.com/apps",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "Fine for accounts you own, hard for everyone else. Without review, only people with a role on your app can connect. Serving any other account needs Business Verification plus App Review for every permission, and verification times range from days to months. Personal Instagram accounts can't connect at all.",
  composio: {
    managed: "yes",
    note: "Composio lists Instagram (and Facebook) under managed OAuth, so you can prototype without your own Meta app. Your own app, and its review, matters once customers need your name on the consent screen.",
    evidence: { kind: "sourced", url: "https://docs.composio.dev/toolkits/managed-auth.md" },
  },
  paths: [
    {
      id: "own-accounts",
      label: "Accounts you manage",
      useCase: "Post or reply for your own brand accounts or a few clients you add as app roles.",
      scopes: ["instagram_business_basic", "instagram_business_content_publish"],
      difficulty: 2,
      timeToFirstToken: "About 1 hour",
      timeToProduction: "Same day (role users only)",
      gate: "None. Standard Access only works for users with a role on the app.",
      evidence: { kind: "sourced", url: ACCESS },
    },
    {
      id: "any-account",
      label: "Any business account",
      useCase: "Let any Instagram professional account connect to your agent.",
      scopes: ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_comments"],
      difficulty: 5,
      timeToFirstToken: "About 1 hour (your own account)",
      timeToProduction: "1-6 weeks with clean documents; months if verification stalls",
      gate: "Business Verification, then App Review per permission, then Live mode",
      evidence: {
        kind: "sourced",
        url: SUBMIT,
        note: "Meta says App Review decisions come 'within a week'. Business Verification has no official duration; forum reports range from 10 days to 3.5 months.",
      },
    },
  ],
  steps: [
    {
      title: "Check your users have professional accounts",
      detail: "Only Instagram business or creator accounts can connect. Choose Instagram Login (no Facebook Page needed) or Facebook Login (account linked to a Page).",
      who: "agent",
      phase: "prepare",
      evidence: { kind: "sourced", url: OVERVIEW },
    },
    {
      title: "Create the app in the Meta App Dashboard",
      detail: "Needs a Facebook account registered as a Meta developer. Add the privacy policy URL and a 1024x1024 icon under Settings > Basic.",
      who: "you",
      phase: "create",
      evidence: { kind: "sourced", url: SUBMIT },
    },
    {
      title: "Register the redirect URI",
      detail: `Add ${COMPOSIO_CALLBACK}. Strict mode is required: HTTPS and an exact match.`,
      who: "both",
      phase: "create",
      evidence: { kind: "sourced", url: SECURITY },
    },
    {
      title: "Test in Development mode",
      detail: "Only people with a role on the app can authorize. Make at least one successful API call per permission; App Review requires one within the 30 days before you submit.",
      who: "you",
      phase: "test",
      evidence: { kind: "sourced", url: MODES },
    },
    {
      title: "Complete Business Verification",
      detail: "Connect the app to a Business portfolio. A Business Admin uploads legal documents whose name and address exactly match the portfolio.",
      who: "you",
      phase: "production",
      paths: ["any-account"],
      evidence: { kind: "sourced", url: BV },
    },
    {
      title: "Submit App Review for each permission",
      detail: "Per permission: a 1080p screen recording of granting and using it, a written use case, and reviewer access to your app without personal credentials.",
      who: "both",
      phase: "production",
      paths: ["any-account"],
      evidence: { kind: "sourced", url: SUBMIT },
    },
    {
      title: "Switch to Live mode and keep the Data Use Checkup current",
      detail: "Live mode only after approval. The Data Use Checkup is annual and required to keep access.",
      who: "you",
      phase: "production",
      paths: ["any-account"],
      evidence: { kind: "sourced", url: DUC },
    },
  ],
  gotchas: [
    {
      title: "Chicken and egg on publishing",
      detail: "The test API call App Review needs can require Advanced Access, which requires Business Verification first.",
      evidence: { kind: "sourced", unofficial: true, url: "https://postproxy.dev/blog/post-to-instagram-via-api/" },
    },
    {
      title: "No registered business, no Advanced Access",
      detail: "Business Verification needs legal documents. Individual developers effectively can't serve other people's accounts.",
      evidence: { kind: "uncertain", note: "Inferred from 'Business Verification is required to get Advanced Access'.", url: ACCESS },
    },
    {
      title: "Reviewers can't reach your app",
      detail: "If reviewers can't access the app, the whole submission is rejected.",
      fix: "Provide a test login that isn't your personal account.",
      evidence: { kind: "sourced", url: "https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review" },
    },
  ],
  agentCan: [
    "Pick Instagram Login vs Facebook Login from your users' setup",
    "Pick the minimum permissions",
    "Draft each permission's use case and screencast script",
    "Check that test calls were made in the last 30 days",
    "Build a Business Verification document checklist",
  ],
  youMust: [
    "Own the developer account and Business portfolio",
    "Upload legal documents as a Business Admin",
    "Record screencasts and submit App Review",
    "Switch to Live mode; repeat the Data Use Checkup yearly",
  ],
  uncertain: [
    "Business Verification duration: no official number.",
    "Meta's official Business Verification document list (Help Center page didn't render for us).",
    "Not tested: needs a Facebook developer account and a business portfolio.",
  ],
  sources: [
    { title: "Instagram Platform overview", url: OVERVIEW, official: true },
    { title: "Access levels", url: ACCESS, official: true },
    { title: "App modes", url: MODES, official: true },
    { title: "Business Verification", url: BV, official: true },
    { title: "App Review submission guide", url: SUBMIT, official: true },
    { title: "Data Use Checkup", url: DUC, official: true },
    { title: "Login security (redirect URIs)", url: SECURITY, official: true },
  ],
};
