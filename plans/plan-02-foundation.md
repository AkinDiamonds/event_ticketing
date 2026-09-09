# Plan 02 - Foundation and Verification

## Goal
Provide a reproducible backend foundation: Express app lifecycle, configuration, logging, errors, health checks, formatting, linting, typechecking, tests, Docker Postgres, migrations, and disposable test database verification.

## Files touched
- [x] `backend/package.json`
- [x] `backend/package-lock.json`
- [x] `backend/.env.example`
- [x] `backend/.prettierrc`
- [x] `backend/eslint.config.js`
- [x] `backend/tsconfig.json`
- [x] `backend/vitest.config.ts`
- [x] `backend/drizzle.config.ts`
- [x] `backend/Dockerfile`
- [x] `docker-compose.yml`
- [x] `docker-compose.test.yml`
- [x] `backend/src/app.ts`
- [x] `backend/src/index.ts`
- [x] `backend/src/config/env.ts`
- [x] `backend/src/config/db.ts`
- [x] `backend/src/db/schema.ts`
- [x] `backend/src/shared/`
- [x] `backend/src/features/health/`
- [x] `backend/src/tests/`
- [x] `backend/scripts/migrate-test.mjs`
- [x] `backend/scripts/verify.mjs`
- [x] `.github/workflows/verify.yml`

## Out of scope - do NOT touch
- [ ] Auth, events, orders, payments, tickets, check-in, notifications, or uploads
- [ ] Production database credentials or automatic production migrations
- [ ] Frontend branch `ayyub_Frontend`
- [ ] Background queues or workers

## Edge cases & failure modes (fill in BEFORE coding)
- [x] Missing required environment variables fail clearly at startup.
- [x] Tests that do not use the database must not open a database connection.
- [x] Verification starts from an empty disposable Postgres database, applies committed migrations, and cleans up even after failure.
- [x] Test configuration must not target a non-test database.
- [x] `db:push` is local experimentation only; verification and future deployment use generated migrations.

## Steps
1. Build the app factory, server entrypoint, shared errors, responses, logging, and health route.
2. Configure Drizzle migration generation and execution without running migrations on app startup.
3. Add Docker Compose Postgres with a healthcheck and a disposable verification lifecycle.
4. Add scripts for migration generation, migration execution, test database reset/cleanup, and `verify`.
5. Add CI that runs the same disposable-database verification; it never connects to production.

## Acceptance criteria
- [x] `npm install`, `npm test`, and the non-Docker verification stages work from the current checkout.
- [x] A fresh disposable Postgres instance accepts every committed migration from zero.
- [x] A failed verification run still tears down its test database and volume.
- [x] CI runs verification against disposable Postgres on every push and pull request.
- [x] No application startup path runs migrations implicitly.

## Security checklist (delete lines that don't apply)
- [x] External input validated
- [x] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
The foundation separates local developer values from the committed environment template and proves schema reproducibility against disposable Postgres. Production migration execution is documented for later deployment but is not connected to CI or application startup.
