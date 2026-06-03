# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DOITUNG / **DE: Development Evaluation** — Next.js 14 + Prisma + MySQL platform for school quality assessment (Q-Model). Thai-language UI (Kanit font). Production runs in Docker on Linux at `https://doitung.cnppai.com`; local dev runs against Laragon MySQL.

The **OKR/RBM module was removed** in the May 2026 cleanup — pages, API routes, `lib/rbm-calculator.ts`, and seed data are gone. Schema models (`OKRObjective`, `OKRKeyResult`, `OKRAction`, `OKRActionRating`, related enums) are intentionally **left in `schema.prisma` and the live DB** as orphans; do not re-introduce code that uses them.

`context.md` is the canonical living document for architecture, decisions, deployment, and known issues — read it first for any non-trivial change. `plan.md` and `tasks.md` track phases and pending work.

## ภาษาที่ใช้ตอบ (response language)

ตอบเป็น **ภาษาไทยเป็นค่าเริ่มต้น** ให้มากที่สุด — รวมถึงสรุปสิ่งที่ทำ, อธิบายโค้ด, รายงานผลทดสอบ, ข้อความ user-facing ใน UI ฯลฯ

ใช้ภาษาอังกฤษเฉพาะ: identifier ในโค้ด, stack trace / error จาก tooling, file path / URL / command line, ศัพท์เทคนิคที่ไม่มีคำไทยเทียบ, หรือเมื่อผู้ใช้พิมพ์เป็นอังกฤษทั้งข้อความ

## Common commands

```bash
npm run dev               # Next dev server on :3000
npm run build             # Next production build (output: standalone, for Docker)
npm run lint              # next lint
npm run db:generate       # Prisma generate
npm run db:push           # Push schema → DB (dev, no migration files)
npm run db:migrate        # prisma migrate dev (creates migration)
npm run db:seed           # Run prisma/seed.ts (dev seed)
npm run db:setup          # check-database.js → generate → push → seed (one-shot bootstrap)
npm run db:studio         # Prisma Studio
npm run test:api          # Smoke test against running server (test-api.js)
```

No unit test framework is configured. `test:api` is a manual end-to-end smoke against `npm run dev`. Hit endpoints directly with curl or edit `test-api.js` to check a single route.

## Architecture quirks (these will bite if you don't know them)

- **`schema.prisma` lives at the repo root**, not `prisma/`. Any prisma CLI invocation in Docker must pass `--schema /app/schema.prisma`. The `prisma/` folder only contains `seed.ts`.
- **Two seed paths**:
  - `prisma/seed.ts` — full dev seed (`npm run db:seed`).
  - `scripts/seed-production.js` — minimal seed used by `docker-entrypoint.sh` on container start. Edit both when you change seed data.
- **Indicator model fields are `textTh` / `textEn`**, not `nameTh` / `nameEn` (which is what `Instrument` and `InstrumentSection` use). There is **no `orderIndex` field** on `Indicator` — order by `id`.
- **`EvaluationResponse.score` vs `.score2`** (Q-Model): `score` = สภาพที่พึงประสงค์ (target, blue). `score2` = สภาพที่เป็นอยู่ (current, purple). Do not swap them. **Exception — THAI_P1_3**: `score` = ระดับการประเมิน (rating), `score2` = ค่าเป้าหมาย (target) — intentionally reversed to avoid migrating existing data.
- **Q-Model has 4 active dimensions**, matched by `InstrumentSection.nameEn`: `Q-Leadership` (L1–L12), `Q-PLC` (PLC1–PLC10), `Q-Learning` (T1–T12), `Q-Students` (S1–S13) → 47 indicators total. `Q-Goal` / `Q-Info` / `Q-Network` are removed — do not re-add.
- **THAI_P1_3 has 5 sections** (50 indicators, LIKERT_1_4). Section 4 was split from "การจัดกระบวนการเรียนรู้และการวัดประเมินผล" into sections 4.1.x (14) and 4.2.x (8) via `scripts/migrate-thai-split-section.js`. Canonical data is in `scripts/data/thai-p1-3.js`.
- **No CSS files for pages** — styling is inline + Tailwind utility usage. `app/globals.css` holds Design System v2 tokens (`--de-*`).
- **All API responses go through `successResponse` / `handleApiError`** in `lib/api-utils.ts` (shape: `{ success, data, error?, message? }`). Use these helpers; don't hand-roll `NextResponse.json`.
- **AI calls go through `lib/ai/client.ts`** (`generateJson`). The model is `OPENROUTER_MODEL` (env var `OPENROUTER_MODEL`, falls back to a default). PII is stripped via `lib/ai/redact.ts` before sending.

## Code layout (high level)

```
app/
  api/
    auth/                 # login, me — JWT issued here
    instruments/[id]/     # + sections, indicators
    evaluations/[id]/     # + responses, teacher-pair, evidence
    evaluations/teacher-pair/  # create 2-sided THAI_P1_3 session
    dashboard/            # summary, q-model, spider-graph
    live-dashboard/       # single aggregator, scope=school|network|district
    networks/, schools/, academic-years/, terms/, indicators/
    sticky-boards/        # get-or-create, by-key, close, clear
    sticky-notes/         # CRUD (Bearer + guest token)
    admin/
      sar-documents/[id]/ # GET detail, DELETE, + subroutes:
                          #   /approve, /file, /pages, /process, /exec-summary
      sar-pages/[pageId]/ # GET/PATCH individual SAR page (after extract)
      schools/            # CRUD (admin)
      networks/[id]/members/ # manage school–network membership
      school-directors/   # list, bind/unbind SCHOOL_LEADER to school
      evaluations/        # admin: reset/cancel/restore evaluation sessions
      feature-flags/      # per-school feature-flag overrides
  admin/
    sar/                  # list SAR documents + new + [id] detail + [id]/review
    schools/              # admin school management
    networks/             # admin network management
    school-directors/     # admin school-director binding
    evaluations/          # admin evaluation management
    settings/feature-flags/ # admin feature flag management
  dashboard/              # main dashboard (real-time polls every 5s) + SpiderChart
  live-dashboard/         # projector/TV-style live screen, polls /api every 5s
  assessment/[id]/        # Q-Model / THAI_P1_3 form (auto-save, tabbed, dual/single mode)
  evaluations/            # list + new + [id] (evidence + reflection per section)
  instruments/, reports/, login/, sticky/
  components/
    ui/                   # Design System v2 primitives: Button, Card, Input, Badge, Container, icons.tsx
    IcebergInput.tsx      # Iceberg Model 4-layer input + display + types
    sticky/               # StickyNoteButton, StickyBoardSurface, StickyNoteCard, StickyNoteModal
lib/
  prisma.ts               # Singleton PrismaClient
  auth.ts                 # bcrypt + jwt; AuthUser, JWTPayload, requireAuth/requireRole
  api-utils.ts            # successResponse / errorResponse / handleApiError / parsePagination
  api-types.ts            # Re-exports Prisma enums + DTO interfaces
  feature-flags.ts        # per-school feature flag helper (reads FeatureFlag model)
  audit.ts                # logAudit() — writes to AuditLog model
  sticky-guest.ts         # guest-token helpers (SHA-256, header parse)
  ai/
    client.ts             # generateJson() via OpenRouter; OPENROUTER_MODEL constant
    redact.ts             # strip PII before AI calls
    hash.ts               # deterministic content hash for dedup
    prompts/              # sar-thai-extract.ts, soar-coach.ts, exec-summary.ts
    schemas/              # Zod schemas + JSON Schema for AI output validation
  jobs/
    extract-or-ocr.ts     # PDF → text extraction (async, saves to SarPage)
    run-soar.ts           # AI SOAR analysis on an approved SAR
    run-exec-summary.ts   # AI Executive Summary (Q-Model scoreboard + Iceberg text)
middleware.ts             # Bearer token gate for /api/instruments|evaluations|dashboard|networks
schema.prisma             # Models (root-level) — OKR* models are orphan, do not use
prisma/seed.ts            # Dev seed
scripts/
  data/
    q-model-rubrics.js    # 47 Q-Model rubrics (canonical, shared by both seeds)
    thai-p1-3.js          # 50 THAI_P1_3 indicators + rubrics (canonical)
  seed-production.js      # Minimal seed used by docker-entrypoint.sh
  migrate-*.js            # One-off migrations (run manually, idempotent)
docker-compose.yml        # eqap_app + eqap_db (MariaDB 11.4)
Dockerfile                # 3-stage: deps → builder (prisma generate) → runner (standalone)
docker-entrypoint.sh      # TCP wait → prisma db push → seed-production.js → node server.js
deploy.sh                 # On-server: git pull → rebuild image → up
```

## Auth flow

`POST /api/auth/login` returns `{ token, user }`. Frontend stores token; sends `Authorization: Bearer <token>`. `middleware.ts` blocks unauthenticated access to protected API prefixes. Route handlers additionally call `requireAuth(req)` or `requireRole(req, 'ADMIN')` from `lib/api-utils.ts`. Default seeded users: `admin@local / Admin123`, `leader@example.com / Leader123`, `teacher@example.com / Teacher123`.

## SAR Module (AI-assisted Self-Assessment Report)

`/admin/sar` — admins and school teachers upload a SAR PDF, the system extracts text page-by-page (`lib/jobs/extract-or-ocr.ts`), AI analyses produce a SOAR analysis (`lib/jobs/run-soar.ts`) and an Executive Summary (`lib/jobs/run-exec-summary.ts`). The Iceberg brainstorm (`app/components/IcebergInput.tsx`) is the qualitative complement to the quantitative Q-Model scoreboard.

Key models: `SarDocument`, `SarDocVersion`, `SarPage`, `SoarEntry`. `SarDocument.aiSummary` (JSON) holds the exec-summary envelope. Status flow: `UPLOADED → EXTRACTING → NEEDS_REVIEW → APPROVED → ARCHIVED`.

The Iceberg cells in `/admin/sar/[id]` are **read-only** in the page UI — the sticky board (`StickyBoardSurface`) is the source of truth for brainstorm content.

## Teacher-pair evaluation (THAI_P1_3)

One teacher is evaluated by 2 `EvaluationSession`s sharing `targetTeacherId` + `instrument/year/term`, distinguished by `EvaluatorKind` (`SELF` = teacher, `DIRECTOR` = ผอ.).

- Create both sides at once: `POST /api/evaluations/teacher-pair` (ADMIN/SCHOOL_LEADER only, idempotent).
- Load combined form: `GET /api/evaluations/[id]/teacher-pair` — returns `{ self, director, responses, editable: 'SELF'|'DIRECTOR'|'BOTH'|'NONE' }`.
- Assessment form renders 2 groups (teacher / director) × (rating + target). Each side saves to its own session; permissions enforce that each party edits only their own side.

## Dashboard aggregation

All four endpoints (`/api/dashboard/summary`, `q-model`, `spider-graph`, `/api/live-dashboard`) read only from `EvaluationResponse` joined to `Indicator` + `InstrumentSection`.

- **Status filter:** `evaluationSession.status: { not: 'ARCHIVED' }`.
- **Per-indicator percent:** `((avgScore - minScore) / (maxScore - minScore)) * 100`, clipped `[0, 100]`.
- **`current` = avg(score2 percent)**, **`target` = avg(score percent)**, **`progress = current / target * 100`** clipped `[0, 120]`. Traffic light: green ≥90, yellow ≥70, red <70.
- **Spider chart** returns raw 1–5 averages (not normalized), `domain={[0, 5]}`.
- `/live-dashboard` supports instrument selection — dimensions come from that instrument's sections. Q-Model uses `nameEn` match; other instruments use their own sections.

## Design System v2

- **Tokens** in `app/globals.css` prefixed `--de-*`. Never hardcode hex in new pages.
- **Primitives** in `app/components/ui/` — `import { Button, Card, Input, Badge, Container } from '@/app/components/ui'`. Icons: inline SVG from `app/components/ui/icons.tsx` (no emoji).
- **Theme**: `ThemeProvider` in `app/layout.tsx`, persisted at `localStorage['de-theme']` (do not collide with `token`/`user`). Anti-FOUC inline script in layout.
- **Migration status**: `/login` ✅ fully reskinned. All other pages still use inline styles — migrate one PR at a time. `/assessment/[id]` is last (requires feature flag + pilot + mysqldump).

## Production deployment (Docker)

- Containers: `eqap_app` (Next standalone, port 9901) + `eqap_db` (MariaDB 11.4, internal only).
- DB on prod: database `okrsdoitung`, user `doitung_user / doitung_pass`, root pw `l6-lyo9N`. Use `mariadb` CLI (not `mysql`) inside the container.
- Deploy: `git pull origin main && bash deploy.sh` from `/DATA/AppData/www/doitung`.
- SQL fixups and migration run-books are documented in `context.md` under "SQL Cleanup" and "One-shot" sections.

## Project conventions

- **Always use Prisma** for DB access. No raw SQL in app code, no mock/hardcoded data arrays.
- **Don't delete existing files** (`context.md`, `plan.md`, `tasks.md`, schema, seed). Edit instead.
- **App Router only.** TypeScript `.ts/.tsx` only — do not introduce `.js` source files (existing root scripts like `test-api.js` and `scripts/*.js` are intentional).
- After completing work that changes architecture, status, or deployment: **update `context.md`**; mark items off in `tasks.md`; advance `plan.md` if the phase changed.
- New components go in `app/components/`, page-specific ones nested under their page directory.

## Environment

```env
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"   # Laragon dev
JWT_SECRET="..."        # required
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OPENROUTER_API_KEY="..."   # required for AI features (SAR extract, SOAR, exec summary)
OPENROUTER_MODEL="..."     # optional override; see lib/ai/client.ts for default
```

Production overrides live in `docker-compose.yml`.
