# OAuth Readiness

**Will your OAuth app be ready in an hour, or in eight weeks?**

Before an agent's users can connect Gmail, Slack or LinkedIn under the developer's own name, the developer needs a provider OAuth app, and some providers make them wait for review. This tool tells a developer, per app: how hard it is, how long until a first token versus until any user can connect, what blocks approval, and which steps an agent can do for them.

- **Library:** 7 checked guides (GitHub, Gmail, Slack, Notion, HubSpot, LinkedIn, Instagram), two of them tested in real provider consoles.
- **Live generation:** type any app name or website and an agent reads that provider's developer docs and writes a shareable guide in 1-2 minutes.

## What I learned, and the decisions it led to

1. **Difficulty belongs to the use case, not the provider.** Gmail takes about 10 minutes to a first token either way, but a send-only agent can launch within days, while an agent that reads mail faces weeks of verification and a paid security audit. So every guide is split into *paths* by the scopes an agent needs, and the developer picks theirs first.
2. **There are two clocks.** "First working token" (you can build) and "any user can connect" (you can launch) differ by weeks for Google, Meta, Slack and LinkedIn. Every path shows both.
3. **The scope decision is the highest-leverage step,** and it's one an agent can do well. Each guide starts with it, and every step is labelled *Agent can do*, *You*, or *Agent drafts, you do*.
4. **OAuth docs go stale quietly,** so evidence is a first-class field. Every claim is **Tested** (we did it in the console), **Sourced** (linked doc) or **Uncertain**. Our own setup attempts corrected two claims and found one undocumented option (see `/method`).
5. **Start from where Composio users are.** Each guide says whether Composio has a managed app, so the developer knows they can prototype today and only need this when they want their own branding, scopes or quota. For live guides this is read from Composio's docs by code, not guessed by the model.

## Scope: what I built, what I left out, and why

The developer's real question is "how long until I can launch, and what will block me?" I scoped to whatever answers that fastest and most honestly.

**In scope**
- **7 hand-checked guides, one per difficulty tier** (self-serve, install caps, light review, verification and audit, business review, partner-gated). Breadth across tiers teaches more than depth in one tier.
- **Use-case paths and two timelines** in every guide, because the scope an agent needs decides the review it faces.
- **Live guides for any app** that cite only pages the agent actually read, with evidence rules enforced in code.
- **An agent-prepared setup kit:** prefilled creation links where providers allow them (GitHub's OAuth App form, Slack's app manifest URL) and copy-ready redirect URI and scopes everywhere else.
- **Composio context:** whether Composio already manages the app, read from Composio's own docs.

**Out of scope, deliberately**
- **The agent creating apps in a developer's account by itself.** It would need the developer's provider login, which an agent shouldn't hold. It prepares everything and hands over a one-click, reviewable form instead.
- **Submitting reviews or verifications** (Google CASA, Meta App Review). These need legal identity, payment or recorded demos.
- **100 library guides.** The live agent plus scheduled re-checks is the path there; hand-writing 100 now would trade honesty for coverage.
- **Accounts, saved guides and a database.** Share links carry the whole guide, so there's nothing to store.
- **Paid model capacity.** It runs on a free tier, so live guides take 1-2 minutes.

## How the live agent works (`lib/agent/pipeline.ts`)

1. Library match? Return the checked guide.
2. Look the app up in Composio's managed OAuth list (`docs.composio.dev/toolkits/managed-auth.md`).
3. **Find the official docs.** Probe `developer.` / `developers.` / `docs.` hosts for an `llms.txt` docs index (common on developer sites in 2026). If none is found, a model call suggests where the docs live and the agent checks those.
4. **Read the pages that matter.** Score index entries and links for OAuth, scopes, review, publishing and rate limits; open up to 8 pages (JavaScript-rendered pages go through a reader service), following relevant links one level deep.
5. A model call writes the guide as JSON against a fixed schema (`lib/schema.ts`), citing only the pages that were read.
6. **Evidence rules enforced in code:** a generated guide can never claim "Tested"; any "Sourced" claim citing a URL we didn't open is downgraded to "Uncertain", and the guide reports how many.
7. Probe the developer console URL (does it exist, does it require sign-in).
8. Stream progress to the page (NDJSON). The finished guide is compressed into the share link (`/shared#g=...`), so sharing needs no database and the guide never touches our server.

## What was tested vs sourced

| Guide | Evidence |
|---|---|
| GitHub | Tested on 2026-10-26: created an OAuth App, viewed consent, reproduced the redirect-mismatch error. Tested on 2026-10-28: the prefilled creation link opens the form with name, homepage and Composio callback filled in |
| Gmail | Tested on 2026-10-26: project, consent screen, scope classification of 9 scopes, redirect validation, 403 for non-test users, unverified-app warning, consent screen. Stopped before granting access |
| Slack, Notion, HubSpot, LinkedIn, Instagram | Sourced from official docs (plus labelled forum reports); not tested because they need a workspace, business portfolio, Page or developer account |

Setup attempts were driven by an agent in a real browser on personal accounts. It stopped before generating secrets or granting access; a person ticked the one policy checkbox. No credentials are in this repo.

## Run it

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free at aistudio.google.com/apikey)
npm run dev
```

`MOCK_GENERATION=1` streams a canned guide without calling the model (for UI work). Deploy on Vercel with `GEMINI_API_KEY` set as an environment variable.

## Limitations

- **Live guides are drafts.** They're read from official docs, not tested, and use a free-tier model. They say so on the page.
- **Why not web search?** Gemini's Google Search grounding has no free quota on new keys (tested 2026-10-26: every model returned 429 with search on, 200 without). Reading the provider's own docs turned out better anyway: every citation is a page the agent actually read. The cost is no forum anecdotes, so real-world review times can be longer than documented.
- **Speed.** About 1-2 minutes per live guide on the free tier; progress streams so the wait is visible.
- **Free-tier quota.** Heavy use returns a "quota used up" message; there's a best-effort per-IP limit.
- **Library freshness.** Checked on 2026-10-26. Provider rules change (GitHub's redirect rules changed in August 2026, HubSpot's listing rules change on 2026-11-02).
- **Not covered yet:** the 100-app library, re-checking guides on a schedule, and having the agent actually create apps (e.g. Slack's `apps.manifest.create`, which needs a one-time token from the developer). These are the next steps I'd take.
- Composio's callback URL is shown as `https://backend.composio.dev/api/v3/toolkits/auth/callback` from its docs; the dashboard value should win.
