# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DOITUNG / **DE: Development Evaluation** — Next.js 14 + Prisma + MySQL platform for school quality assessment (Q-Model). Thai-language UI (Kanit font). Production runs in Docker on Linux at `https://doitung.cnppai.com`; local dev runs against Laragon MySQL.

The **OKR/RBM module was removed** in the May 2026 cleanup — pages, API routes, `lib/rbm-calculator.ts`, and seed data are gone. Schema models (`OKRObjective`, `OKRKeyResult`, `OKRAction`, `OKRActionRating`, related enums) are intentionally **left in `schema.prisma` and the live DB** as orphans; do not re-introduce code that uses them. They can be dropped in a future migration when no historical data needs preserving.

`context.md` is the canonical living document for architecture, decisions, deployment, and known issues — read it first for any non-trivial change. `plan.md` and `tasks.md` track phases and pending work.

## ภาษาที่ใช้ตอบ (response language)

ตอบเป็น **ภาษาไทยเป็นค่าเริ่มต้น** ให้มากที่สุด — รวมถึงสรุปสิ่งที่ทำ, อธิบายโค้ด, รายงานผลทดสอบ, ข้อความใน commit message body, ข้อความ user-facing ใน UI, README ที่เขียนใหม่ ฯลฯ

ใช้ภาษาอังกฤษเฉพาะกรณีต่อไปนี้เท่านั้น:
- ตัว identifier ในโค้ด (ชื่อตัวแปร / function / class / type / API path / DB column / git branch)
- ข้อความ error จาก compiler / runtime / external tool (อย่าแปล stack trace)
- ชื่อ file path, URL, command line
- บริการเทคนิคเฉพาะที่ไม่มีคำไทยเทียบ (เช่น "stacking context", "pointer capture", "fullscreen API")
- เมื่อผู้ใช้พิมพ์เป็นภาษาอังกฤษทั้งข้อความ

หัวเรื่อง / bullet / inline label ในคำตอบ — ใช้ไทยถ้ามีคำที่ตรงพอใช้ได้ คอมเมนต์ในซอร์สโค้ด — ใช้อังกฤษตามคอนเวนชันเดิมของโปรเจกต์ (ไม่ต้องแปล)

## Common commands

```bash
npm run dev               # Next dev server on :3000
npm run build             # Next production build (output: standalone, for Docker)
npm run lint              # next lint
npm run db:generate       # Prisma generate
npm run db:push           # Push schema → DB (dev, no migration files)
npm run db:migrate        # prisma migrate dev (creates migration)
npm run db:seed           # Run prisma/seed.ts (dev seed — mirrors scripts/seed-production.js)
npm run db:setup          # check-database.js → generate → push → seed (one-shot bootstrap)
npm run db:studio         # Prisma Studio
npm run test:api          # Smoke test against running server (test-api.js)
```

There is no unit test framework configured. `test:api` is a manual end-to-end smoke against `npm run dev`. To run a single API check, edit `test-api.js` or hit endpoints directly with curl.

## Architecture quirks (these will bite if you don't know them)

- **`schema.prisma` lives at the repo root**, not `prisma/`. Any prisma CLI invocation in Docker must pass `--schema /app/schema.prisma`. The `prisma/` folder only contains `seed.ts`.
- **Two seed paths**:
  - `prisma/seed.ts` — full dev seed (`npm run db:seed`).
  - `scripts/seed-production.js` — minimal seed used by `docker-entrypoint.sh` on container start. Edit both when you change seed data.
- **Indicator model fields are `textTh` / `textEn`**, not `nameTh` / `nameEn` (which is what `Instrument` and `InstrumentSection` use). There is **no `orderIndex` field** on `Indicator` — order by `id`.
- **`EvaluationResponse.score` vs `.score2`**: `score` = สภาพที่พึงประสงค์ (Desired State / target, blue). `score2` = สภาพที่เป็นอยู่ (Current State / now, purple, Q-Model only). Do not swap them.
- **Q-Model has 4 active dimensions**, matched by `InstrumentSection.nameEn`: `Q-Leadership` (L1–L12), `Q-PLC` (PLC1–PLC10), `Q-Learning` (T1–T12), `Q-Students` (S1–S13) → 47 indicators total. The legacy `Q-Goal` / `Q-Info` / `Q-Network` dimensions are **removed** — do not re-add them.
- **No CSS files for pages** — styling is inline + Tailwind utility usage. `app/globals.css` is minimal.
- **All API responses go through `successResponse` / `handleApiError`** in `lib/api-utils.ts` (shape: `{ success, data, error?, message? }`). Use these helpers; don't hand-roll `NextResponse.json`.

## Code layout (high level)

```
app/
  api/                   # Next.js Route Handlers (App Router)
    auth/                # login, me — JWT issued here
    instruments/[id]/    # + sections, indicators
    evaluations/[id]/    # + responses
    dashboard/           # summary, q-model, spider-graph (all aggregate from EvaluationResponse)
    live-dashboard/      # single aggregator endpoint, scope=school|network|district
    networks/, schools/, academic-years/, terms/, indicators/
  dashboard/             # main dashboard page (real-time polls every 5s) + SpiderChart
  live-dashboard/        # projector/TV-style live screen, polls /api every 5s
  assessment/[id]/       # Q-Model form (Likert 1→5, tabbed sections, auto-save) + school aggregate widget
  evaluations/, instruments/, reports/, login/
lib/
  prisma.ts              # Singleton PrismaClient
  auth.ts                # bcrypt + jwt; AuthUser, JWTPayload, requireAuth/requireRole
  api-utils.ts           # successResponse / errorResponse / handleApiError / parsePagination
  api-types.ts           # Re-exports Prisma enums + DTO interfaces shared with frontend
middleware.ts            # Bearer token gate for /api/instruments|evaluations|dashboard|networks
schema.prisma            # Models (root-level, see above) — OKR* models are orphan, do not use
prisma/seed.ts           # Dev seed
scripts/                 # check-database.js, seed-production.js (Docker), setup-database.{bat,sql}
docker-compose.yml       # eqap_app + eqap_db (MariaDB 11.4) on doitung_eqap_network
Dockerfile               # 3-stage: deps → builder (incl. prisma generate) → runner (standalone)
docker-entrypoint.sh     # TCP wait → prisma db push → seed-production.js → node server.js
deploy.sh                # On-server: git pull → rebuild image → up
```

## Auth flow

`POST /api/auth/login` (public) returns `{ token, user }`. Frontend stores token; sends `Authorization: Bearer <token>` on subsequent calls. `middleware.ts` blocks unauthenticated traffic to the protected API prefixes; route handlers can additionally call `requireAuth(req)` or `requireRole(req, 'ADMIN')` from `lib/api-utils.ts`. `JWT_SECRET` and `JWT_EXPIRES_IN` (default `7d`) come from env. Default seeded users: `admin@local / Admin123`, `leader@example.com / Leader123`, `teacher@example.com / Teacher123`.

## Dashboard aggregation (post-OKR)

All four dashboard endpoints — `/api/dashboard/summary`, `/api/dashboard/q-model`, `/api/dashboard/spider-graph`, `/api/live-dashboard` — read **only** from `EvaluationResponse` joined to `Indicator` + `InstrumentSection`. They share the same conventions:

- **Status filter:** `evaluationSession.status: { not: 'ARCHIVED' }`. DRAFT/SUBMITTED/REVIEWED responses all count, so the dashboard updates in real time as teachers auto-save in `/assessment/[id]`.
- **Per-indicator percent:** `((avgScore - minScore) / (maxScore - minScore)) * 100`, clipped `[0, 100]`.
- **Q-Model dimensions matched by `InstrumentSection.nameEn`** — exactly four: `Q-Leadership`, `Q-PLC`, `Q-Learning`, `Q-Students`.
- **`current` = avg(score2 percent)** (สภาพที่เป็นอยู่), **`target` = avg(score percent)** (เป้าหมายพึงประสงค์), **`progress = current / target * 100`** clipped `[0, 120]`. Traffic light: green ≥90, yellow ≥70, red <70.
- **Spider chart** returns raw 1–5 averages (not normalized) since the chart's `domain={[0, 5]}`.
- **Scope filter:** `school` (single id), `network` (all schools via `SchoolNetworkMember`), `district` (no school filter).

Real-time:
- `/dashboard` polls the 3 dashboard endpoints every 5 s, with a LIVE indicator + Pause button in the header.
- `/assessment/[id]` polls `/api/live-dashboard?scope=school&schoolId=...` every 5 s and renders a school-wide aggregate widget (4 mini progress bars + teacher count) below the personal progress bar.
- `/live-dashboard` (projector view) was already polling at 5 s and still works.

## Production deployment (Docker)

- Containers: `eqap_app` (Next standalone, port 9901) + `eqap_db` (MariaDB 11.4, internal only).
- DB on prod: database `okrsdoitung`, user `doitung_user / doitung_pass`, root password `l6-lyo9N` (the live one — different from the docker-compose default). Use `mariadb` CLI inside the container, not `mysql`.
- Deploy from `/DATA/AppData/www/doitung` on the server: `git pull origin main && bash deploy.sh`.
- Common SQL fixups (e.g. duplicated indicators after schema rename) are documented in `context.md` under "SQL Cleanup".

## Project conventions worth following

These come from `.cursorrules` and the repo's working agreement — they bind both Cursor and Claude Code:

- **Always use Prisma** for DB access. No raw SQL in app code, no mock/hardcoded data arrays in components or routes.
- **Don't delete existing files** (especially `context.md`, `plan.md`, `tasks.md`, schema, seed). Edit instead.
- **App Router only.** No Pages Router. TypeScript `.ts/.tsx` only — do not introduce `.js` source files (existing root scripts like `test-api.js` and `scripts/*.js` are intentional).
- After completing work that changes architecture, status, or deployment: **update `context.md`**; mark items off in `tasks.md`; advance `plan.md` if the phase changed. These are how future sessions resume — keep them current.
- New components go in `app/components/`, page-specific components nested under their page directory (see `app/dashboard/components/`).

## Environment

```env
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"   # Laragon dev
JWT_SECRET="..."        # required — auth.ts has a dev fallback, do not rely on it
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Production overrides live in `docker-compose.yml`.
