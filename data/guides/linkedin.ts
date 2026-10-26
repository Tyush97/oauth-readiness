import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const GETTING_ACCESS = "https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access";
const AUTH_CODE = "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow";
const INCREASING = "https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access";
const CM_REVIEW = "https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review";
const PARTNER = "https://learn.microsoft.com/en-us/linkedin/shared/linkedin-api-partner-support-guide";

export const linkedin: Guide = {
  slug: "linkedin",
  name: "LinkedIn",
  website: "https://www.linkedin.com",
  domain: "linkedin.com",
  category: "Social",
  consoleUrl: "https://www.linkedin.com/developers/apps",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "Two different worlds. Sign-in and posting as a member are self-serve with no review. Almost everything else (company pages, analytics, ads) is a partner program for registered companies, with no fixed timeline and no right to reapply from a rejected app.",
  composio: {
    managed: "yes",
    note: "Composio manages the LinkedIn toolkit, but 'LinkedIn Ads' is listed as bring-your-own OAuth app. That matches the pattern here: partner-gated APIs need your own approved app.",
    evidence: { kind: "sourced", url: "https://docs.composio.dev/toolkits/managed-auth.md" },
  },
  paths: [
    {
      id: "member",
      label: "Sign in and post as a member",
      useCase: "Read basic profile and email, post on the member's behalf.",
      scopes: ["openid", "profile", "email", "w_member_social"],
      difficulty: 1,
      timeToFirstToken: "Under 1 hour",
      timeToProduction: "Same day",
      gate: "None. Open products are self-serve.",
      launchDays: 0,
      evidence: { kind: "sourced", url: GETTING_ACCESS },
    },
    {
      id: "pages",
      label: "Company pages and analytics",
      useCase: "Post as a company page, read page analytics and comments (Community Management API).",
      scopes: ["w_organization_social", "r_organization_social", "rw_organization_admin"],
      difficulty: 5,
      timeToFirstToken: "Days to weeks (Development tier vetting)",
      timeToProduction: "Weeks to months, case by case",
      gate: "Partner vetting: registered legal entity, business email, Page super-admin verification",
      launchDays: null,
      evidence: { kind: "sourced", url: CM_REVIEW },
    },
  ],
  steps: [
    {
      title: "Map your actions to open vs partner products",
      detail: "Posting as a member uses Share on LinkedIn (`w_member_social`) with no review. Page posting, analytics and ads need partner approval.",
      who: "agent",
      phase: "prepare",
      evidence: { kind: "sourced", url: GETTING_ACCESS },
    },
    {
      title: "Create the app and link a LinkedIn Page",
      detail: "Developer portal > Create app. The app is associated with a LinkedIn Page, verified by the Page's super admin for some products.",
      who: "you",
      phase: "create",
      evidence: { kind: "sourced", url: "https://learn.microsoft.com/en-us/linkedin/marketing/quick-start" },
    },
    {
      title: "Add the redirect URL",
      detail: `Add ${COMPOSIO_CALLBACK}. Must be absolute HTTPS; no '#'.`,
      who: "both",
      phase: "create",
      evidence: { kind: "sourced", url: AUTH_CODE },
    },
    {
      title: "Add Sign In and Share on LinkedIn from the Products tab",
      detail: "These open products are granted immediately.",
      who: "you",
      phase: "create",
      paths: ["member"],
      evidence: { kind: "sourced", url: GETTING_ACCESS },
    },
    {
      title: "Request Community Management on a separate app",
      detail: "It must be the only product on its app. Use a business email (personal emails fail) and finish the vetting survey within 21 days.",
      who: "you",
      phase: "production",
      paths: ["pages"],
      evidence: { kind: "sourced", url: PARTNER },
    },
    {
      title: "Move from Development to Standard tier",
      detail: "Development tier: 500 calls per app per day. Standard needs test credentials, a product overview and a screencast per use case.",
      who: "both",
      phase: "production",
      paths: ["pages"],
      evidence: { kind: "sourced", url: CM_REVIEW },
    },
  ],
  gotchas: [
    {
      title: "No refresh tokens for most apps",
      detail: "Access tokens last 60 days; programmatic refresh is only for a limited set of partners. Users must re-authorize.",
      fix: "Build a re-consent prompt before day 60.",
      evidence: { kind: "sourced", url: AUTH_CODE },
    },
    {
      title: "Rejected apps can't reapply",
      detail: "A rejected Community Management request means creating a new app and starting again.",
      evidence: { kind: "sourced", url: CM_REVIEW },
    },
    {
      title: "Changing scopes revokes old tokens",
      detail: "Requesting a different scope set invalidates the member's previous access tokens.",
      evidence: { kind: "sourced", url: AUTH_CODE },
    },
    {
      title: "Adding a partner product can break Sign In",
      detail: "Developers report that adding Community Management to an app using Sign In removed Sign In from that app.",
      evidence: { kind: "sourced", unofficial: true, url: "https://community.supertokens.com/t/22951028/hello-i-m-facing-an-issue-with-linkedin-auth-recently-linked" },
    },
  ],
  agentCan: [
    "Steer you to open products where they cover the use case",
    "Check the app name and logo for banned LinkedIn marks",
    "Draft vetting answers and the use-case narrative",
    "Plan the second app for Community Management",
  ],
  youMust: [
    "Create or own the LinkedIn Page and get super-admin verification",
    "Verify a business email",
    "Submit vetting and record the screencast",
  ],
  uncertain: [
    "Whether http://localhost redirects are accepted.",
    "Approval odds for partner programs: LinkedIn publishes none and reserves the right to reject.",
    "Not tested: needs a LinkedIn Page and business email.",
  ],
  sources: [
    { title: "Getting access", url: GETTING_ACCESS, official: true },
    { title: "Authorization code flow", url: AUTH_CODE, official: true },
    { title: "Increasing access", url: INCREASING, official: true },
    { title: "Community Management app review", url: CM_REVIEW, official: true },
    { title: "API partner support guide", url: PARTNER, official: true },
  ],
};
