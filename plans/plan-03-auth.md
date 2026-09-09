# Plan 03 - Authentication

## Goal
Implement email/password authentication with email verification, JWT access and refresh tokens, token rotation/revocation, password reset, and middleware that exposes the authenticated user to protected routes.

## Files touched
- [ ] `backend/src/features/auth/`
- [ ] `backend/src/db/schema.ts`
- [ ] `backend/src/shared/middleware/authenticate.ts`
- [ ] `backend/src/shared/middleware/validate.ts`
- [ ] `backend/src/shared/utils/email.ts`
- [ ] `backend/src/db/migrations/`
- [ ] `backend/src/app.ts`

## Out of scope - do NOT touch
- [ ] Event, order, ticket, payment, check-in, notification, or upload business logic
- [ ] Production email provider implementation
- [ ] Frontend branch `ayyub_Frontend`

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] Duplicate email returns 409 without exposing password data.
- [ ] Wrong password and invalid tokens return 401 without account enumeration.
- [ ] Verification and reset tokens are hashed, single-use, and expire.
- [ ] Refresh rotation atomically invalidates the old token.
- [ ] Password reset revokes every refresh token for the user.
- [ ] Forgot-password returns the same success response for unknown email.
- [ ] Email delivery failure does not make registration or reset token creation inconsistent.

## Steps
1. Add auth tables and a committed migration.
2. Add provider-neutral email sender ports with a test/no-op adapter.
3. Add validation, repository, service, controller, routes, and authentication middleware.
4. Add colocated endpoint tests against disposable Postgres.
5. Register the feature in the app and generated API documentation.

## Acceptance criteria
- [ ] All nine auth endpoints use the standard response envelope.
- [ ] Register, verify, login, refresh, logout, logout-all, forgot-password, and reset-password flows pass end to end.
- [ ] Every endpoint has happy-path, validation-failure, and applicable auth-failure coverage.
- [ ] The fresh migration set applies successfully before tests run.

## Security checklist (delete lines that don't apply)
- [ ] External input validated
- [ ] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
The service owns authentication state while middleware owns request authentication. Raw credentials and tokens never reach logs or storage, and the disposable database verifies the schema and token lifecycle together.
