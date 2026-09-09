# Conventions

The rulebook every contributor — human or AI — follows so the codebase reads like it was written by one disciplined person. If a plan step conflicts with this file, this file wins: update the file first, then the code.

## Naming
- Files: dot-namespaced by feature (`auth.service.ts`, `auth.routes.ts`, `auth.controller.ts`)
- Variables/functions: `camelCase`; classes/types: `PascalCase`
- DB tables: `snake_case`, plural (`ticket_tiers`)
- Booleans read as questions: `isEmailVerified`, `isOrganizer`

## Structure
```
src/
  features/<feature>/
    <feature>.routes.ts
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.repository.ts
    <feature>.schemas.ts
    <feature>.openapi.ts
    <feature>.test.ts        # colocated — no separate top-level tests/ folder
    index.ts                  # barrel file, see below
  shared/
    middleware/
    utils/
```
One feature = one folder. **No cross-feature imports except through a feature's `index.ts` barrel file.** The barrel exports only the specific functions another feature is allowed to call (e.g. `ticket-tiers/index.ts` exports `reserveTierInventory()`). Reaching directly into another feature's `.repository.ts`, `.service.ts`, or `.controller.ts` is a review-blocking mistake, not a style nitpick — it's what keeps features independently testable and replaceable.

## Error handling
- Throw typed errors (`class NotFoundError extends AppError`), never bare strings
- One centralized error-handling middleware converts errors → HTTP responses
- Never swallow an error silently (no empty `catch {}`)

## API contract
- REST verbs mean what they say; no `POST /getUser`
- Every response uses the standard envelope — `{ success, statusCode, message, data }` on success, `{ success, statusCode, message, errors }` on failure. Never a bare array/object.
- Status codes: **422** validation (not 400 — a well-formed request with invalid content is 422, not a malformed request), 401 auth, 403 permission, 404 missing, 409 conflict, 500 unhandled

## Testing
- Every new endpoint gets, at minimum: one happy-path test, one validation-failure test, one auth-failure test
- Test names describe behavior: `it('rejects login after 5 failed attempts')`
- Tests are colocated (`<feature>.test.ts` inside the feature's own folder), never in a separate mirror folder. Foundation smoke tests may remain under `src/tests/` until their own cleanup plan.
- Database-backed tests use disposable Docker Postgres recreated from committed migrations.

## Security baseline (non-negotiable, every PR)
- Every external input validated before use (body, query, params, headers)
- Only parameterized queries — never string-concatenated SQL
- No secret, key, or token ever committed — env vars only
- Every route touching user data checks auth in middleware, not inside the handler
- Public endpoints get rate limiting
- Logs never contain passwords, tokens, or full card/PII values

## Dependencies
Adding one requires a one-line justification in the plan file. If the standard library or an existing dependency already does it, don't add one.

## Project-Specific Rules
- Money is always stored and calculated as an **integer in kobo**, never a float. Never introduce a `Decimal`/float column or variable for any price, total, or amount.
- Ticket codes: **6 characters, uppercase alphanumeric, excluding ambiguous characters** (`0`/`O`, `1`/`I`/`L`). Never change the character set or length without updating already-issued codes' validity, since it affects every ticket in the system.
- Timestamps are stored and compared in **UTC** everywhere in the backend. Converting to local time (WAT) is a frontend-only concern — never do it in a query, a log line, or a business-logic comparison.
- Refresh tokens and password/email-verification tokens are **hashed before being stored**, same as passwords — never store any of these in plaintext, even temporarily.
- A ticket code is the entire proof of ownership (see `backend-technical-documentation.md`, Section 7). Never add a name/identity check on top of it without that being a deliberate, documented decision in `DECISIONS.md` — it's easy to "helpfully" add a check that quietly breaks the buy-for-others flow.

## Git Workflow

### Branching
- One branch per plan: `plan-<number>-<short-kebab-description>` — e.g. `plan-05-ticket-checkout`. The backend is developed from `main`; the frontend is developed separately on `ayyub_Frontend`.

### Commits
- Conventional Commits, using only this fixed prefix set: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`. If a change doesn't fit one of these, it's probably two commits, not one.

### Pull requests
- Title: `Plan <number>: <short description>` — e.g. `Plan 07: Ticket checkout`.
- Description must include:
  - Link to the plan file (for example, `plans/plan-05-orders-payments.md`)
  - **Deliverables checklist**, copied from the plan, each item checked off as done — or explicitly marked "deferred" with a one-line reason. Never silently drop a deliverable.
  - **Edge cases / security issues considered** (from the plan's edge-cases section) and how each was actually handled
  - **How it was tested** — commands run, plus anything checked manually beyond the automated suite
  - **Breaking change?** (yes/no — and if yes, exactly what's affected: an endpoint shape, a schema column, an env var)
  - **Intended reviewer**: teammate or Copilot, so the reviewer knows what kind of scrutiny to bring and who's expected to hit merge

### Merging
- **Squash-merge only** — one plan, one PR, one commit on `main`. Keeps `PROGRESS.md` and git history pointing at each other 1:1.
- `main` is protected: no direct pushes, at least one approving review required before merge is even possible.

### CI and migration verification
CI must run the same disposable Postgres verification as local development on every push and pull request. It applies committed migrations from zero, runs `npm run verify`, and destroys the test database afterward. CI never connects to production; production migrations are explicit deployment steps added when hosting is configured.
