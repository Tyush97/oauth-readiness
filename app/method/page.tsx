import Link from "next/link";
import { EvidenceLegend } from "@/components/bits";

export const metadata = { title: "How we check" };

const CHECKS: { claim: string; source: string; result: "confirmed" | "corrected" | "new" | "unverified"; detail: string }[] = [
  { claim: "GitHub OAuth Apps need no review", source: "GitHub docs", result: "confirmed", detail: "Created an app on a free personal account in about 20 seconds; no review step." },
  { claim: "GitHub OAuth Apps have one callback URL; tokens never expire", source: "Older third-party guides", result: "corrected", detail: "The 2026 form allows up to 10 redirect URIs, optional wildcard matching, and turns token expiry on by default." },
  { claim: "Unregistered redirect URIs fail", source: "GitHub docs", result: "confirmed", detail: "Reproduced the 'Be careful! The redirect_uri is not associated with this application' page." },
  { claim: "gmail.metadata is restricted", source: "Gmail scopes page", result: "confirmed", detail: "Google's console sorted it under restricted, with readonly, modify and full access." },
  { claim: "calendar.events is a restricted scope", source: "Vendor guide (Nylas)", result: "corrected", detail: "Google's console classifies calendar.events as sensitive (no security audit)." },
  { claim: "Testing mode: only listed test users can connect", source: "Google Cloud help", result: "confirmed", detail: "Even the app's creator got 'Access blocked ... Error 403: access_denied' until added as a test user." },
  { claim: "Sensitive scopes need https redirect URIs", source: "Google OAuth docs", result: "confirmed", detail: "Console rejected http://example.com inline; localhost was accepted." },
  { claim: "Internal user type skips verification", source: "Google docs", result: "confirmed", detail: "True, but the 'Make internal' button is disabled without a Google Workspace organization." },
  { claim: "(not in any source) Google client option for AI agents", source: "Found in console", result: "new", detail: "'Use this client for an AI-powered agent': for clients using Google MCP tools. No documentation found beyond the tooltip." },
  { claim: "GitHub's new-OAuth-app form can be prefilled by link", source: "Our setup kit", result: "confirmed", detail: "Opened with name, homepage and the Composio callback filled in (2026-10-28). Nothing was submitted." },
  { claim: "Instagram and LinkedIn have Composio-managed apps", source: "Composio managed-auth page", result: "confirmed", detail: "Both listed as managed; 'LinkedIn Ads' is bring-your-own, consistent with partner gating." },
  { claim: "Notion public connections may require review before the auth URL appears", source: "Notion docs (two pages disagree)", result: "unverified", detail: "No Notion account was signed in during testing. Marked Uncertain in the guide." },
  { claim: "Meta Business Verification takes 10 days to months", source: "Forum reports", result: "unverified", detail: "No official duration exists. Shown as a range with the anecdotal sources linked." },
  { claim: "Google CASA costs $500-$4,500 a year", source: "Google Health API page + vendors", result: "unverified", detail: "Google's number is for a different API; applied to Gmail by analogy and flagged." },
];

const LIVE_CHECKS: { app: string; claim: string; result: "confirmed" | "corrected"; detail: string; url: string }[] = [
  { app: "Zoom", claim: "Authorization URL approval takes 72 hours", result: "confirmed", detail: "Zoom: '72hrs - once all requirements have been met'.", url: "https://developers.zoom.us/docs/distribute/app-submission/authorization-url-faq.md" },
  { app: "Zoom", claim: "Beta apps hit a maximum number of test installs; authorization URLs expire", result: "confirmed", detail: "Both errors are documented with renewal steps.", url: "https://developers.zoom.us/docs/distribute/app-submission/authorization-url-faq.md" },
  { app: "Calendly", claim: "Developer account is separate from your Calendly account", result: "confirmed", detail: "'This is not your Calendly user account.'", url: "https://developer.calendly.com/docs/authentication/creating-an-oauth-app.md" },
  { app: "Calendly", claim: "Sandbox allows http://localhost; Production needs HTTPS", result: "confirmed", detail: "Stated per environment.", url: "https://developer.calendly.com/docs/authentication/creating-an-oauth-app.md" },
  { app: "Calendly", claim: "Client secret is shown once", result: "confirmed", detail: "'you will not be able to access the Client Secret or Webhook signing key again'.", url: "https://developer.calendly.com/docs/authentication/creating-an-oauth-app.md" },
  { app: "Calendly", claim: "Access tokens last 2 hours; 8 tokens per user per minute", result: "confirmed", detail: "Both on the token endpoint page.", url: "https://developer.calendly.com/api-docs/calendly-o-auth/o-auth/post-oauth-refresh-token.md" },
  { app: "Calendly", claim: "You must implement PKCE", result: "corrected", detail: "Calendly recommends PKCE but doesn't enforce it for web apps; code-level steps are now excluded from guides since Composio handles the flow.", url: "https://developer.calendly.com/docs/authentication/creating-an-oauth-app.md" },
];

const RESULT_CHIP = {
  confirmed: "chip chip-ok",
  corrected: "chip chip-you",
  new: "chip chip-agent",
  unverified: "chip chip-warn",
} as const;

export default function Method() {
  return (
    <article className="narrow page">
      <h1>How we check</h1>
      <p className="lede">
        OAuth setup docs go stale quietly, and a wrong &ldquo;this takes a day&rdquo; can cost a team weeks. So every claim in a guide carries a label, and we tell you what we couldn&apos;t confirm.
      </p>
      <div style={{ marginTop: 24 }}><EvidenceLegend /></div>

      <section className="section">
        <h2>Library guides</h2>
        <ol className="list">
          <li>Two agents researched seven providers from official docs first, then forums, tagging every claim with its source.</li>
          <li>For GitHub and Google, an agent then drove a real browser through the setup on personal accounts: create the app, add scopes, register redirect URIs, open the consent screen. It stopped before granting access or generating secrets, and a person ticked the one policy checkbox.</li>
          <li>What the console showed overrides what the docs said. The table below lists every check.</li>
        </ol>
      </section>

      <section className="section">
        <h2>What we checked, corrected and couldn&apos;t verify</h2>
        <div className="table-wrap panel" style={{ padding: 8 }}>
          <table className="simple">
            <thead>
              <tr><th>Claim</th><th>From</th><th>Result</th><th>What we saw</th></tr>
            </thead>
            <tbody>
              {CHECKS.map((c) => (
                <tr key={c.claim}>
                  <td>{c.claim}</td>
                  <td className="muted">{c.source}</td>
                  <td><span className={RESULT_CHIP[c.result]}>{c.result}</span></td>
                  <td className="muted">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Live guides for any other app</h2>
        <ol className="list">
          <li><strong>Composio check (code, not the model).</strong> We read Composio&apos;s managed OAuth list and look the app up, so &ldquo;can I prototype today?&rdquo; is answered from the source.</li>
          <li><strong>Find the docs.</strong> The agent checks the provider&apos;s developer site for an <code>llms.txt</code> docs index; if there isn&apos;t one, the model suggests where the docs live and the agent checks.</li>
          <li><strong>Read the right pages.</strong> It opens the pages about creating an app, scopes, review, publishing and rate limits, and follows relevant links one level deep (up to 8 pages). Pages that don&apos;t load are dropped and listed.</li>
          <li><strong>The guide is written against a fixed schema.</strong> Paths, steps, who does each step, blockers, and evidence per claim.</li>
          <li><strong>Evidence rules are enforced in code.</strong> A generated guide can never say &ldquo;Tested&rdquo;. A claim citing a URL we didn&apos;t open is downgraded to Uncertain, and the guide says how many were downgraded.</li>
          <li><strong>Sharing needs no database.</strong> The whole guide is compressed into the link, validated again when opened.</li>
        </ol>
        <h3 style={{ marginTop: 32, marginBottom: 12 }}>Spot checks of live guides (2026-10-26)</h3>
        <div className="table-wrap panel" style={{ padding: 8 }}>
          <table className="simple">
            <thead>
              <tr><th>App</th><th>Agent&apos;s claim</th><th>Result</th><th>Source check</th></tr>
            </thead>
            <tbody>
              {LIVE_CHECKS.map((c) => (
                <tr key={c.claim}>
                  <td>{c.app}</td>
                  <td>{c.claim}</td>
                  <td><span className={RESULT_CHIP[c.result]}>{c.result}</span></td>
                  <td className="muted"><a href={c.url} target="_blank" rel="noreferrer">{c.detail}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
          Live guides read official docs only and use a free-tier model, so they&apos;re a strong first draft, not a substitute for a tested guide. They miss real-world review times that only show up in developer forums. <Link href="/">Try one</Link>.
        </p>
      </section>
    </article>
  );
}
