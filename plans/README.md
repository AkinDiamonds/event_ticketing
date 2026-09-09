# Plans - Roadmap

This directory contains the implementation contract for the LASU Party Tickets backend. Every plan follows `plan_TEMPLATE.md`. Scope, edge cases, acceptance criteria, and security checks are written before implementation; the understanding note is completed afterward.

## Roadmap

| Plan | Title | Status | Depends on |
| --- | --- | --- | --- |
| 01 | Technical documentation | Done | - |
| 02 | Foundation and verification | Done | 01 |
| 03 | Authentication | Not started | 02 |
| 04 | Events and ticket tiers | Not started | 03 |
| 05 | Orders, payments, reservations, and tickets | Not started | 04 |
| 06 | Check-in | Not started | 05 |
| 07 | Notifications | Not started | 05 |
| 08 | Image uploads | Not started | 04 |

Plans 06, 07, and 08 may be developed in parallel after Plan 05 or their direct dependency is complete. Each schema-changing plan commits its generated migration files in the same change.

## Verification gate

Every plan that changes code must run `npm run verify` against a disposable Docker Postgres database. Verification must:

1. Start a clean test database.
2. Apply every committed migration from zero.
3. Run formatting, linting, typechecking, and tests.
4. Tear down the test database and volume even when a command fails.

CI will run the same disposable test workflow on every push and pull request. It will never connect to production. Production migration execution is a later deployment concern and must be explicit; the application must not migrate on startup.

## Repository and branch workflow

The backend is developed from the backend repository's `main` branch. The frontend is developed separately on `ayyub_Frontend`. Backend plans must not include frontend files, and frontend work consumes the documented API contract. A plan can be committed and reviewed independently as long as its migrations and verification remain reproducible.

For the current setup, the contributor may keep several completed plan changes in the worktree while building. Before committing, split changes into coherent plan commits: documentation/roadmap first, foundation/scripts second, then later feature plans. Do not commit or push automatically as part of plan execution.

## MVP completion

The MVP is complete when:

1. Plans 01-08 are marked Done in `PROGRESS.md`.
2. `npm run verify` passes from a clean checkout with disposable Postgres.
3. A staging event can be created, tickets purchased through Paystack test mode, codes delivered, and codes checked in.
4. Production configuration and explicit migration execution are documented before deployment.
5. Swagger is available at `/api/docs`, unless deliberately disabled with `ENABLE_SWAGGER=false`.

## Deferred by design

Refund execution UI and automatic refund policy, ticket transfers/resale, waitlists, push notifications, multi-staff check-in, per-event identity binding, and background job infrastructure are not part of these plans. A verified Paystack payment that cannot be fulfilled is preserved as `payment_exception` for operational reconciliation; refund execution remains provider/account dependent and must be deliberately added later.
