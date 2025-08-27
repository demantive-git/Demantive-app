Git repo: https://github.com/demantive-git/Demantive-app.git

IMPORTANT:

1. All UI screens and components must be in light mode using a lot of white. Even if users system is in dark mode the app should be in light mode.
2. For api key and secrets I will use the vercel envirnonment variable
3. Always push git through termninal to deploy in vercel instead of building locally

## status snapshot (source of truth)

- Live deploy: Vercel (working)
- Env vars: set on Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`)
- Auth: Supabase email/password + Google OAuth (working)
- Multitenancy: base tables `organizations`, `users`, `memberships` in place
- RLS: enabled on all three tables and policies applied (working)
- Function: `user_orgs()` (security definer) exists
- RPC: `create_org_with_admin(name text)` creates org + admin membership atomically (used by UI)
- UI: Org selection + create org flow (working)
- Build: pnpm aligned to `10.14.0`; Vercel deploys succeed
- CI: GitHub Action runs `db:push` (Drizzle); for RLS/policies we applied SQL directly in Supabase

## decisions (locked for now)

- Use Supabase Auth with email/password + Google (no magic links)
- Create organizations via RPC to satisfy RLS and ensure atomicity
- Keep RLS/policies/functions managed via idempotent SQL in Supabase (can migrate to Drizzle migrations later)
- Keep UI strictly light mode

## near-term next (priority)

1. Org switching UX polish (list + active indicator)
2. Default post-signup redirect to `/orgs` → auto-redirect to sole org if only one
3. Invitations: add membership by email (admin only)
4. Basic Sentry client setup
5. Health endpoint already exists; wire to status page in UI

# what we're building (short + sharp)

A production "connect-and-go" CMO visibility app that sits on top of HubSpot/Salesforce and gives:

- instant Programs in market (rolled up from CRM data),
- What changed (WoW/MoM) with one-line reasons,
- What's working / not and Next 3 moves,
- a Friday summary email and a 5-slide board pack,
- a one-question chat that answers in plain English.

No ad platform connectors in v1. Your edge is executive storytelling + decisions, not dashboards.

---

# the "ultimate" pragmatic stack (prod-ready)

## Front end

- Next.js (App Router) + React 18/19 on Vercel
- *TypeScript, *Zod (runtime validation), TanStack Query (server cache & retries)
- Tailwind + shadcn/ui (fast, consistent UI), react-hook-form
- Auth UI: Supabase Auth UI or custom (see Auth below)
- Feature flags: Unleash (hosted) or simple env-driven flags

## Backend & data

- Supabase (Postgres 15+), Row Level Security on all tenant data
- Supabase Edge Functions for webhooks & jobs
- pg_cron (or Vercel Cron) to trigger 15-min sync
- Supabase Storage for board-pack PDFs
- Drizzle ORM (or Kysely) for typed SQL without magic

## Integrations

- HubSpot: OAuth app + REST APIs (Contacts/Companies/Deals) + Webhooks
- Salesforce: OAuth (web server flow) + REST (Leads/Contacts/Accounts/Opportunities)
- Email: Postmark (production-grade deliverability)
- (Optional) Google Slides API for slide gen → export PDF (or server-side PDF via Chromium)

## AI layer

- LLM: GPT-5 (reasoning) for chat + narrative generation
- *Prompting: toolformer-style with *strict schema outputs (Zod) and guardrails (refuse when data is too sparse)

## Observability & ops

- Sentry (front/back), OpenTelemetry traces (basic), Vercel logs
- Health checks: edge function /health + nightly sync report
- *Secrets: Vercel env for app secrets, *encrypted token vault table for per-tenant OAuth tokens (AES-GCM with key from env)
- *CI/CD: GitHub → Vercel; *db migrations via Drizzle

---

# data model (lean, multi-tenant, durable)

Tenancy

- organizations (id, name)
- users (id, email, name)
- memberships (org_id, user_id, role)

Connections & sync

- oauth_connections (id, org_id, provider, instance_base_url, access_token_cipher, refresh_token_cipher, scope, expires_at, status, last_synced_at, cursor)
- sync_runs (id, org_id, provider, started_at, finished_at, status, counts_json, error_text)
- webhook_events (id, org_id, provider, event_type, payload_json, received_at, processed_at, status)

Raw → normalized

- raw_objects (id, org_id, provider, object_type, external_id, payload_json, system_modstamp, first_seen_at, last_seen_at)
- people (id, org_id, external_id, provider, email, name, account_id, created_at)
- companies (id, org_id, external_id, provider, name, domain, created_at)
- opportunities (id, org_id, external_id, provider, company_id, amount, stage, status, close_date, created_at)
- (optional) activities (...)

Programs & mapping

- programs (id, org_id, name, description, active)
- program_rules (id, org_id, rule_type, pattern, target_program_id, enabled, priority)
  - rule types: contains, regex, equals against campaign/source/name fields
- record_programs (org_id, record_type, record_id, program_id, confidence)

Snapshots & insights

- daily_rollups (org_id, day, program_id, leads, opps, won, pipeline_amount)
- changes (org_id, period_start, period_end, program_id, metric, delta, reason_text)
- data_quality (org_id, metric, value, observed_at) // e.g., "% opps missing close_date"

Outputs

- emails (id, org_id, sent_at, subject, body_html, status)
- board_packs (id, org_id, period_start, period_end, storage_path, status)

All tables have RLS: org_id = auth.jwt().org_id. Admins can write, Viewers read-only.

---

# end-to-end architecture (at a glance)

1. User auths via Supabase Auth → chooses/creates Organization.
2. Connect CRM (HubSpot or Salesforce) via OAuth → we store encrypted tokens.
3. Backfill 90 days into raw_objects (paged + throttled) → normalize to people/companies/opportunities.
4. Program mapping auto-applies rules → populate record_programs.
5. Rollups & changes jobs compute daily_rollups + "what changed" + reasons.
6. UI: Home shows totals, programs, deltas; Chat answers; Programs editor updates rules.
7. Friday job sends Wins/Risks/Next 3; Board pack PDF saved to Supabase Storage.

---

# step-by-step build roadmap (ship small, in order)

## Phase 0 --- project & guardrails (1--2 days)

- Create repo; set TypeScript strict, ESLint, Prettier, Husky pre-commit.
- Provision Supabase project; enable RLS; add pgcrypto / pg_trgm / pg_cron.
- Set up Drizzle migrations; create the tenancy + oauth + raw tables first.
- Add Sentry (DSNs for client & server), feature flags (env-driven).
- Secrets: set envs for HubSpot, Salesforce, Postmark, encryption key.

Exit: main deploys to Vercel; migrations auto-apply; health endpoint live.

---

## Phase 1 --- Auth, orgs, & roles (1--2 days)

- Supabase Auth (email link to start; add SSO later).
- Org creation/join flow; invite via email; roles: admin, editor, viewer.
- RLS policies: org-scoped reads; only admins can manage connections/rules.

Exit: multi-tenant ready; access control enforced by RLS.

---

## Phase 2 --- CRM connectors (HubSpot + Salesforce) (5--6 days)

HubSpot

- OAuth (app.hubspot.com) → store tokens encrypted.
- Fetch: Contacts, Companies, Deals (paged; updatedAt cursor).
- Webhooks: subscribe to contact/deal create/update → enqueue light sync.

Salesforce

- OAuth web server flow (login.salesforce.com/test.salesforce.com) → capture instance_url.
- Fetch: Leads, Contacts, Accounts, Opportunities using SystemModstamp cursor.
- Start with REST; add Bulk API later for very large orgs if needed.

Common

- Backfill job (90 days): write to raw_objects only, with idempotent upserts.
- Normalizer: deterministic mappers raw→normalized with natural keys (external_id + provider).
- Rate limits: exponential backoff, resume from cursor, store "last good cursor" in oauth_connections.

Exit: connect either CRM, run a backfill, see normalized rows in DB.

---

## Phase 3 --- program mapping engine (3--4 days)

- Implement program_rules: contains, regex, equals on source/campaign/name. Priority + enabled flags.
- Batch assign record_programs with confidence 1.0 when a single rule hits; if multiple hit, pick highest priority.
- Coverage meter: % of last 90-day opps mapped.
- AI suggestions (optional v1.0.1): propose rules for the top unmapped patterns; one-click accept.

UI

- Programs page: list programs, rules; "preview impact" before save (how many records change).

Exit: ≥85% mapping on a sample org in <5 minutes.

---

## Phase 4 --- rollups & change detection (3--4 days)

- Nightly compute daily_rollups per program: Leads, Opps, Won, Pipeline.
- "What changed" (WoW/MoM deltas) with simple reason heuristics:
  - volume change, conversion drop, follow-ups stalled, attribution missing.
- Data quality metrics (missing close_date, amount, source); surface as nudges.

Exit: Home can show programs + deltas + 1-line reasons with a freshness timestamp.

---

## Phase 5 --- the UX that sells it (3--4 days)

Home

- Header: Pipeline, New Opps, Won (30/90 selector) with arrows.
- Programs table: L→O→W + WoW/MoM + reason snippet + "data quality" icon.
- Freshness badge ("Synced 6 min ago from HubSpot").

Programs

- Manage rules, preview impact, coverage meter; audit log rows.

Onboarding wizard

- Step 1: pick CRM → OAuth
- Step 2: pick date range (default 90d)
- Step 3: review suggested programs/rules → confirm
- Step 4: done → Home

Exit: five-minute "connect-and-go" feels real, not a toy.

---

## Phase 6 --- chat + narrative (2--3 days)

- System prompt enforces output schema: Headline / Why / Do next (3) with references to program names + numbers.
- Tools: one function to query daily_rollups/changes; one to fetch "data quality" notes.
- Guardrail: if coverage <70% or data quality poor, the model starts with a caution line ("data is partial; X% opps lack close date").

Exit: 10 canned questions return consistent, trustworthy answers in <2s.

---

## Phase 7 --- Friday email & board pack (2--3 days)

Friday email

- CRON hits edge function; compile Wins / Risks / Next 3 with program bullets.
- Postmark transactional template; store a copy in emails.

Board pack

- Option A (simple): server-rendered HTML → Headless Chromium → PDF → Supabase Storage.
- Option B (enterprise-leaning): generate Google Slides via API, then export PDF. Saves time on layout; easier brand themes.

Exit: Click Download board pack; PDF matches Home numbers exactly.

---

## Phase 8 --- reliability & polish (2--3 days)

- Token lifecycle: proactive refresh 5 min before expiry; handle revocation with a clear Reconnect UI.
- Backpressure: cap concurrent sync per org; job queue with FIFO; per-org locks.
- Observability: Sentry breadcrumbs on sync runs; nightly "sync health" email to admins.
- Access: Viewer (read only), Editor (rules), Admin (connections & members).
- Copy polish: no jargon; every metric has a tooltip "what this means."

Exit: revoke tokens / hit rate limits / restart jobs → app degrades gracefully.

---

## Phase 9 --- UAT & production readiness (2--3 days)

- UAT with 2--3 orgs (one on each CRM).
- Verify 5 random figures against CRM UI (±1--2%).
- Run disaster drills: webhook burst, API 429s for 10 min, token revoked.
- Security checklist: RLS verified, tokens encrypted, least-priv scopes, logs scrub PII.

Exit: green light to onboard first paying logos.

---

# best-practice notes (so we don't shoot ourselves)

- Stage → normalize. Always ingest API payloads into raw_objects first, then normalize. It makes reprocessing & debugging sane.
- Idempotency everywhere. Upserts by (provider, external_id). Re-runs never duplicate.
- Use cursors, not "last run time." HubSpot/Salesforce both provide modified stamps—persist cursors per connection.
- RLS first. Write policies before writing app code so you don't leak across orgs.
- Explainability beats magic. Every "reason" line should be traceable to a metric or rule (no black-box claims).
- Don't fan out too early. v1 supports exactly one active CRM per org; multiple connectors come later.
- Ship text > charts. Execs want the story; charts come later if asked.
- Sane defaults. 90-day window, 15-min sync, Friday 5pm local email.

---

# acceptance criteria (what "done" looks like)

- Onboarding: OAuth + backfill < 10 min; user lands on Home with real numbers.
- Coverage: ≥85% of opps mapped to a program in 90d window after initial rules.
- Freshness: last sync < 15 min under normal use; webhook events applied within ~1 min where available.
- Accuracy: 5 random program numbers match CRM within ±1--2%.
- Email: Friday email readable in 30s on mobile; exec forwards as-is.
- Board pack: 5 pages, clean layout, same numbers as Home.
- Chat: 10 canonical questions answered consistently with Headline/Why/Do-next format.
- Resilience: token revocation & 429s do not break UI; show actionable banners.

---

# suggested folder layout

/apps/web
/app (Next.js App Router)
/(marketing) ...
/(app)
/home
/chat
/programs
/settings
/components, /lib (supabase client, auth, zod schemas)
/server (route handlers for OAuth redirects, secure actions)
/styles, /utils
/packages/db (Drizzle schema + migrations)
/packages/types (shared zod types)
/packages/workers (sync orchestrator, queue interfaces)
/supabase/functions
hubspot-webhook/
salesforce-webhook/
sync-run/ # cron-triggered incremental
nightly-rollup/ # compute daily_rollups + changes
friday-email/
generate-board-pack/

---

# milestone schedule (aggressive but realistic, ~4 weeks)

- Week 1: Auth + orgs + RLS; HubSpot & Salesforce OAuth; 90-day backfill to raw_objects; normalize to core tables.
- Week 2: Incremental sync (15-min), HubSpot webhooks; Programs + rules engine + coverage meter; Home v1.
- Week 3: Rollups + change detection; Data-quality nudges; Chat answers; Friday email.
- Week 4: Board pack; onboarding wizard polish; reliability (rate limits, token refresh, reconnect UX); Sentry + UAT.
