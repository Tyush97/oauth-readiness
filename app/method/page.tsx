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
  { claim: "Instagram and LinkedIn have Composio-managed apps", source: "Composio managed-auth page", result: "confirmed", detail: "Both listed as managed; 'LinkedIn Ads' is bring-your-own, consistent with partner gating." },
  { claim: "Notion public connections may require review before the auth URL appears", source: "Notion docs (two pages disagree)", result: "unverified", detail: "No Notion account was signed in during testing. Marked Uncertain in the guide." },
  { claim: "Meta Business Verification takes 10 days to months", source: "Forum reports", result: "unverified", detail: "No official duration exists. Shown as a range with the anecdotal sources linked." },
  { claim: "Google CASA costs $500-$4,500 a year", source: "Google Health API page + vendors", result: "unverified", detail: "Google's number is for a different API; applied to Gmail by analogy and flagged." },
];

const RESULT_CHIP = {
  confirmed: "chip chip-tested",
  corrected: "chip chip-you",
  new: "chip chip-agent",
  unverified: "chip chip-uncertain",
} as const;

export default function Method() {
  return (
    <>
      <h1>How we check</h1>
      <p className="lede">
        OAuth setup docs go stale quietly, and a wrong &ldquo;this takes a day&rdquo; can cost a team weeks. So every claim in a guide carries a label, and we tell you what we couldn&apos;t confirm.
      </p>
      <div className="section"><EvidenceLegend /></div>

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
        <div className="table-wrap panel" style={{ padding: 6 }}>
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
          <li><strong>Two web searches in parallel.</strong> One on setup (console, redirect rules, scopes, tokens), one on approval (review, limits, durations, developer complaints).</li>
          <li><strong>Every cited page is opened.</strong> Search results that don&apos;t load are dropped and listed.</li>
          <li><strong>The guide is written against a fixed schema.</strong> Paths, steps, who does each step, blockers, and evidence per claim.</li>
          <li><strong>Evidence rules are enforced in code.</strong> A generated guide can never say &ldquo;Tested&rdquo;. A claim citing a URL we didn&apos;t open is downgraded to Uncertain, and the guide says how many were downgraded.</li>
          <li><strong>Sharing needs no database.</strong> The whole guide is compressed into the link, validated again when opened.</li>
        </ol>
        <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
          Live guides use a free-tier model with Google Search grounding, so they&apos;re a strong first draft, not a substitute for a tested guide. <Link href="/">Try one</Link>.
        </p>
      </section>
    </>
  );
}
