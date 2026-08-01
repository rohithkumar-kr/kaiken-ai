# Kaiken AI — Implementation Roadmap (MVP → Production)

> "Cut through resume noise with precision AI evaluation."

Each milestone is **independently testable**: it ends with a defined _Exit Review_ that must pass before the next milestone starts. Milestones are listed in build order (M1 → M8) because of data/plumbing dependencies, but M5, M6, and M7 can be worked **in parallel** once M4 lands, since they build on independent parts of the schema and AI layer.

---

## Definition of MVP

**MVP = M1 → M4.** A signed-in user can upload a resume, receive an ATS score with a structured breakdown (format / keywords / content), see strengths and improvement areas, and view their history. This validates the core value proposition (precision AI evaluation) before investing in comparison and generation.

Post-MVP (M5 → M8) adds comparison, suggestions, regeneration, monetization, and production hardening.

---

## Milestone Overview

| #   | Milestone                       | Deliverable                                       | Verifies                       |
| --- | ------------------------------- | ------------------------------------------------- | ------------------------------ |
| M1  | Foundations & Test Baseline     | Buildable skeleton, DB migrated, lint/build green | `npm run build` passes         |
| M2  | Authentication & App Shell      | Clerk auth + protected dashboard shell            | Full auth flow works           |
| M3  | Resume Upload & Management      | UploadThing upload, PDF text extraction, CRUD     | Resume persists end-to-end     |
| M4  | ATS Analysis Engine             | Gemini streaming, scoring, results UI             | Real AI analysis rendered      |
| M5  | JD Comparison & Keywords        | JD CRUD, compare flow, keyword report             | Keyword diffs against a JD     |
| M6  | Suggestions & Regeneration      | AI suggestions, improved resume, export           | Generated resume from a source |
| M7  | Monetization: Credits & Billing | Plan gating, credit ledger, Stripe subs           | Limits enforced; upgrade flow  |
| M8  | Production Hardening & Launch   | Reliability, SEO, observability, deploy           | Production checks pass         |

---

## M1 — Foundations & Test Baseline

**Goal:** A clean, verified foundation everything else sits on.

**Work items:**

- Install deps: `@clerk/nextjs`, `prisma`/`@prisma/client`, `uploadthing` (+ uploadthing react), `@google/generative-ai`, `react-hook-form`, `zod`, `recharts`, `zustand`, `sonner`, `clsx`, `tailwind-merge`.
- `npx shadcn@latest init` + add needed primitives (button, card, input, dialog, form, sonner, badge, tabs, progress, select, skeleton, textarea).
- Tailwind v4 + `globals.css` theme tokens, path aliases (`@/*` → `src/*`).
- `next.config.ts`: `cacheComponents: true`, image remote patterns for UploadThing/Clerk.
- `.env.local` + `.env.example` with `DATABASE_URL`, `NEXT_PUBLIC_CLERK_*`, `UPLOADTHING_*`, `GEMINI_API_KEY`.
- Prisma: validate `src/prisma/schema.prisma`, run initial migration, seed script.
- Test baseline: Vitest + React Testing Library config, one smoke unit test; Playwright config + one smoke E2E.
- Root `error.tsx`, `not-found.tsx`, `loading.tsx`; `lib/utils.ts` (`cn`).

**Acceptance criteria:**

- `npm run lint` and `npm run build` pass with zero errors.
- `npx prisma migrate dev` creates all 9 tables; `npx prisma studio` lists empty tables.
- `npx prisma validate` is clean.
- Root layout renders `/` with theme tokens; no hydration warnings.
- `npm run test` runs the smoke test; `npx playwright test` boots the dev server and loads `/`.

**Exit review:** dev/prod build green, DB migrated, test runners operational.

---

## M2 — Authentication & App Shell

**Goal:** Users can sign in/up; authenticated users get the dashboard shell; unauthenticated traffic is steered correctly.

**Work items:**

- `proxy.ts` (Next 16 — not `middleware.ts`) protecting `/dashboard`, `/resumes`, `/compare`, `/generate`, `/settings`.
- Root layout: `ClerkProvider`, `<Toaster>`.
- Clerk routes: `(auth)/sign-in/[[...sign-in]]`, `(auth)/sign-up/[[...sign-up]]`.
- `lib/auth.ts`: `requireUser()` helper; Clerk webhook handler syncing `User` rows (backed by `WebhookEvent` idempotency).
- Dashboard layout: sidebar, topbar, user menu, mobile nav; auth guard in layout (authoritative, proxy is optimistic).
- Marketing landing `(marketing)/page.tsx` + `pricing` placeholder.

**Acceptance criteria:**

- Unauthenticated visit to `/dashboard` → redirected to sign-in; sign-in → back to dashboard.
- `requireUser()` throws when unauthenticated; returns a `User` row when authenticated (row exists after webhook or on-demand upsert).
- Clerk webhook fires twice with the same `eventId`; DB processes it once (`WebhookEvent.processed`).
- Sign-out returns to marketing page.
- Shell renders on desktop + mobile without overflow or console errors.

**Exit review:** full sign-in → sign-out journey automated (Playwright) and passing.

---

## M3 — Resume Upload & Management

**Goal:** Users can upload resumes (PDF/DOCX/TXT), see parsed text, list, and delete them.

**Work items:**

- `api/uploadthing/route.ts` + UploadThing config in `lib/uploadthing.ts` (file types, size limits, auth check).
- Server Action `actions/resumes.ts`: create (after upload completes, from returned `fileKey`), list, get, delete (incl. UploadThing file cleanup), `revalidatePath`.
- Upload wizard `(dashboard)/resumes/new`: dropzone → preview → save. Loading + error states, Sonner toasts.
- Text extraction service: PDF (pdf-parse), DOCX (mammoth), TXT/MD (read). Runs in action; updates `parseStatus` PENDING→PROCESSING→COMPLETED/FAILED with `extractedText`.
- Resume list/detail pages with skeletons and empty states.

**Acceptance criteria:**

- Uploading a valid PDF yields a `Resume` row with `fileUrl`, correct `fileSize/type`, and `extractedText` populated.
- Uploading a corrupt file yields `parseStatus = FAILED` + `parseError`, no crash, user sees a toast.
- List shows newest-first; delete removes row and the underlying UploadThing file; refresh reflects it.
- Oversized/unsupported file is rejected by UploadThing client-side and server-side.
- Unauthenticated POST to the action is rejected (auth re-checked inside the action).

**Exit review:** end-to-end upload→parse→list→delete passing in Playwright; extraction unit-tested for all 3 formats.

---

## M4 — ATS Analysis Engine (MVP core)

**Goal:** The product's heart — precision AI evaluation with a structured ATS report.

**Work items:**

- `lib/ai/client.ts` (Gemini init from env), `lib/ai/prompts.ts` (ATS evaluation prompt), `lib/ai/schemas.ts` (Zod schemas for LLM JSON output — scores, strengths, improvements, keywords, suggestions).
- Streaming route `api/ai/analyze/route.ts`: auth check → validate Zod input → stream Gemini tokens back; returns SSE/chunked text.
- Server Actions `actions/analyses.ts`: create `Analysis` (PENDING → PROCESSING), persist results on completion (scores, summary, strengths/improvements JSON, `KeywordMatch`, `Suggestion` rows, `analyzedAt`, `modelVersion`), handle FAILED with error capture, deduct credit transactionally.
- Results UI `(dashboard)/resumes/[id]`: score gauge + radar/bar breakdown (Recharts), keyword chips, suggestion cards, streaming progress while analyzing.
- Dashboard overview `(dashboard)/dashboard`: latest score, history trend chart.

**Acceptance criteria:**

- `lib/ai/schemas.ts` validates (accepts) a real Gemini response and rejects malformed output (unit tests).
- Running analysis creates an `Analysis` with `status=COMPLETED`, all scores populated, ≥1 `KeywordMatch` and ≥1 `Suggestion` row.
- Malformed/empty Gemini output → `Analysis.status = FAILED` + `error`, no partial orphan data, UI shows retry.
- Analysis respects credit balance: balance decremented exactly once (no double-spend under concurrent clicks).
- Unauthenticated analyze request returns 401; analysis of another user's resume returns 403.
- UI shows live progress during streaming and full report after; scores persist on refresh.

**Exit review:** real Gemini evaluation end-to-end, malformed-output failure path tested, credits correct. **This is the MVP gate.**

---

## M5 — Job Description Comparison & Keywords

**Goal:** Compare a resume against a job description and surface missing keywords.

**Work items:**

- `actions/job-descriptions.ts`: create/list/get/delete JD (paste form, `title`, `company`, `content`).
- `(dashboard)/compare/[resumeId]` page: select/paste JD → run analysis with `jobDescriptionId` set.
- Keyword report UI: PRESENT vs MISSING chips grouped by importance; resume text highlighting where matched keywords appear.
- History: past comparisons accessible from resume detail.

**Acceptance criteria:**

- Analysis created with a `jobDescriptionId` returns keyword scores plus PRESENT/MISSING keyword lists derived from the JD.
- JD CRUD works; deleting a JD does **not** delete past analyses (SetNull) and the comparison history remains readable.
- Missing-keyword chips only show keywords actually absent from `extractedText`.
- Comparison page fully functional with loading/error/empty states.

**Exit review:** compare-with-JD journey passing; JD deletion preserves history.

---

## M6 — AI Suggestions & Resume Regeneration

**Goal:** Users get actionable rewrite suggestions and can generate an improved resume.

**Work items:**

- Suggestions UI: group by type/severity, inline accept/copy for `aiRewrite`.
- Streaming route `api/ai/generate/route.ts` + `actions/generated-resumes.ts`: create `GeneratedResume` (PENDING→PROCESSING→COMPLETED/FAILED), store structured `content` JSON, link source resume + analysis/JD.
- `(dashboard)/generate/[resumeId]` flow: choose source + optional JD → stream generation → review → save.
- Export: render to Markdown download (`ResumeFormat.MARKDOWN`).

**Acceptance criteria:**

- Copying/accepting a suggestion works; suggestion `aiRewrite` is displayed when present.
- Generation creates a `GeneratedResume` with structured `content` JSON; `status` transitions correctly; failure path sets `error`.
- Generated content reflects the target JD (spot-check keyword usage in tests by comparing output vs. JD keywords).
- Markdown export downloads and opens cleanly.
- Generation is gated by credits + plan like analysis.

**Exit review:** full suggestion→regenerate→download flow automated and passing.

---

## M7 — Monetization: Credits & Billing

**Goal:** Enforce usage limits and support upgrades.

**Work items:**

- Credit policy per plan (e.g., FREE: 3 analyses/month, PRO: unlimited); enforce atomically in actions (transaction + conditional update on `User.credits`).
- `CreditTransaction` written on every earn/spend/adjust; balance shown in UI.
- Settings page: plan card, credit balance, usage history.
- Stripe integration (Post-MVP, can be scoped independently): checkout, webhook → `Subscription`, entitlement sync; upgrade/downgrade/cancel flows.

**Acceptance criteria:**

- Free user hits limit → blocked with a clear upgrade prompt; balance math matches the ledger exactly (unit test).
- Concurrent spend requests spend at most the available balance (race-condition test).
- Stripe checkout produces an ACTIVE `Subscription`; webhook replay is idempotent via `eventId`.
- Downgrade/expiry correctly flips `User.plan` and stops PRO-only features.

**Exit review:** usage limits + billing flows verified; Stripe test-mode end-to-end.

---

## M8 — Production Hardening & Launch

**Goal:** Reliable, observable, fast, secure production deployment.

**Work items:**

- Reliability: `loading.tsx`/`error.tsx`/`not-found.tsx` on all routes; Suspense boundaries; retry logic on AI failures; graceful degradation when Gemini is down.
- Security: audit actions for auth/ownership (RBAC helpers), rate limiting on AI endpoints, secrets only in env, UploadThing file type/size caps, CORS on streaming routes, security headers.
- Performance: React Compiler/`use cache` on read-heavy pages, targeted caching for resume analysis, bundle analysis, LCP/CWV budget.
- SEO/metadata: marketing metadata, OG images, sitemap/robots.
- Observability: Vercel Analytics, structured logging, error tracking (Sentry), AI call instrumentation (tokens, latency, failure rate).
- Testing: full Playwright suite green, load test of AI route under expected concurrency.
- Deploy: Neon prod DB + migrations on deploy, env config, preview envs, launch checklist.

**Acceptance criteria:**

- Every route has a working loading/error/empty state (Playwright-injected failures).
- Security scan of server actions/routes: no unauthenticated or cross-tenant access (automated ownership tests).
- Core Web Vitals within budget on marketing + dashboard.
- AI route handles 5× expected peak RPS without 5xx blowup (load test report).
- Deploy to Vercel: prod build green, migrations applied, smoke test passes against prod.

**Exit review:** full production checklist green — **ready to launch**.

---

## Parallelization

Once M4 is merged, teams can split:

- Team A → M5 (comparison)
- Team B → M6 (suggestions/generation)
- Team C → M7 (monetization)

M8 absorbs the integration and hardening of all three.

## Top Risks & Mitigations

| Risk                                              | Mitigation                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Gemini output doesn't match schema / hallucinates | Strict Zod validation in `lib/ai/schemas.ts`, retry + FAILED path, prompt versioning (`modelVersion`) |
| PDF parsing quality poor                          | Support 3 formats, parse unit tests, clear FAILED state, store `extractedText` for debuggability      |
| AI cost / latency                                 | Streaming UX, model tiering per plan, rate limits, credit model, instrumentation on tokens/cost       |
| Credit double-spend                               | Atomic conditional updates in transactions + race-condition tests                                     |
| Next 16 breaking changes                          | Build against bundled docs (`node_modules/next/dist/docs/`), verify at every milestone                |

## Definition of Done (every milestone)

1. `npm run lint` and `npm run build` green.
2. Acceptance criteria verified (unit + Playwright).
3. No dead code; Zod-validated boundaries; secrets in env only.
4. Loading, error, and empty states present for new UI.
