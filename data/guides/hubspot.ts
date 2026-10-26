import type { Guide } from "@/lib/schema";
import { COMPOSIO_CALLBACK } from "@/lib/schema";

const OVERVIEW = "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/overview";
const MANAGE = "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot";
const QUICKSTART = "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/oauth-quickstart-guide";
const LISTING = "https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements";
const LIMITS = "https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits";
const CHANGES = "https://developers.hubspot.com/changelog/app-listing-and-app-certification-requirement-updates-for-may-2026";

export const hubspot: Guide = {
  slug: "hubspot",
  name: "HubSpot",
  website: "https://www.hubspot.com",
  category: "CRM",
  consoleUrl: "https://developers.hubspot.com",
  origin: "library",
  lastChecked: "2026-10-26",
  summary:
    "No review to start, but a ceiling. An unlisted app can be installed by up to 25 accounts, which is enough for a pilot. Beyond that you need a Marketplace listing, which needs 3 real active installs before you can apply. New apps are built with the HubSpot CLI, not a web form.",
  composio: {
    managed: "yes",
    note: "Composio lists HubSpot under managed auth, so you can prototype before building your own app.",
    evidence: { kind: "sourced", url: "https://docs.composio.dev/toolkits/managed-auth" },
  },
  paths: [
    {
      id: "pilot",
      label: "Up to 25 customers",
      useCase: "Pilot with a handful of customer HubSpot accounts.",
      scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
      difficulty: 2,
      timeToFirstToken: "Under 1 hour with a developer test account",
      timeToProduction: "Same day, capped at 25 installs",
      gate: "Install cap. No review.",
      evidence: { kind: "sourced", url: MANAGE },
    },
    {
      id: "listed",
      label: "Unlimited (Marketplace)",
      useCase: "Any HubSpot customer can install.",
      scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
      difficulty: 3,
      timeToFirstToken: "Under 1 hour",
      timeToProduction: "Initial review within 10 business days; up to 60 days overall",
      gate: "Marketplace listing: 3 active unaffiliated installs, demo video, every scope used",
      evidence: { kind: "sourced", url: LISTING },
    },
  ],
  steps: [
    {
      title: "Scaffold the app with the HubSpot CLI",
      detail: "hs get-started, hs project create, then hs project upload to your developer account. Legacy public apps can't be created any more.",
      who: "both",
      phase: "create",
      evidence: { kind: "sourced", url: OVERVIEW },
    },
    {
      title: "Configure OAuth with Composio's redirect URL",
      detail: `Add ${COMPOSIO_CALLBACK}. Production redirect URLs must be HTTPS. Mark scopes required vs optional, and request only what you use.`,
      who: "agent",
      phase: "create",
      evidence: { kind: "sourced", url: QUICKSTART },
    },
    {
      title: "Install in a developer test account",
      detail: "The installing user needs Super Admin in the target account.",
      who: "you",
      phase: "test",
      evidence: { kind: "sourced", url: QUICKSTART },
    },
    {
      title: "Choose marketplace distribution (unlisted)",
      detail: "Allows up to 25 installs with no review. Private distribution allows 10 allowlisted accounts.",
      who: "you",
      phase: "production",
      evidence: { kind: "sourced", url: LIMITS },
    },
    {
      title: "Submit the listing after 3 active installs",
      detail: "Live terms and privacy URLs, a support contact, public setup docs and a demo video or guided walkthrough.",
      who: "both",
      phase: "production",
      paths: ["listed"],
      evidence: { kind: "sourced", url: LISTING },
    },
  ],
  gotchas: [
    {
      title: "30-minute access tokens",
      detail: "Access tokens expire after 1,800 seconds. Agents must refresh constantly.",
      evidence: { kind: "sourced", url: QUICKSTART },
    },
    {
      title: "Listing rules changed in 2026",
      detail: "Demo videos required since 2026-03-31. From 2026-11-02, new listings built on legacy apps or Projects 2023.2/2025.1 are rejected.",
      fix: "Build on the current developer platform version.",
      evidence: { kind: "sourced", url: CHANGES },
    },
    {
      title: "Sensitive data scopes need Enterprise customers",
      detail: "Sensitive scopes are requested from HubSpot's Ecosystem Quality team, and installing accounts must be on Enterprise.",
      evidence: { kind: "sourced", unofficial: true, url: "https://developers.hubspot.com/docs/api-reference/latest/crm/properties/sensitive-data" },
    },
  ],
  agentCan: [
    "Scaffold the project and write the auth config with minimal scopes",
    "Flag scopes your code doesn't use (listing rejects them)",
    "Draft listing copy, privacy policy, setup docs and demo script",
  ],
  youMust: [
    "Own the developer account and run hs auth",
    "Get 3 real customers actively using the app",
    "Submit the listing",
  ],
  uncertain: [
    "Whether HubSpot developer accounts are free and whether localhost redirects work.",
    "Not tested: needs a HubSpot developer account and the CLI.",
  ],
  sources: [
    { title: "Build apps overview", url: OVERVIEW, official: true },
    { title: "Manage apps", url: MANAGE, official: true },
    { title: "OAuth quickstart", url: QUICKSTART, official: true },
    { title: "Marketplace listing requirements", url: LISTING, official: true },
    { title: "Install limits changelog", url: LIMITS, official: true },
    { title: "2026 listing requirement updates", url: CHANGES, official: true },
  ],
};
