# Plan 03 - Authentication

## Goal
Implement email/password authentication with email verification, JWT access and refresh tokens, token rotation/revocation, password reset, and middleware that exposes the authenticated user to protected routes.

## Files touched
- [x] `backend/src/features/auth/`
- [x] `backend/src/db/schema.ts`
- [x] `backend/src/shared/middleware/authenticate.ts`
- [x] `backend/src/shared/middleware/validate.ts`
- [x] `backend/src/shared/utils/email.ts`
- [x] `backend/src/shared/utils/password.ts`
- [x] `backend/src/shared/utils/tokens.ts`
- [x] `backend/src/types/express.d.ts`
- [x] `backend/src/config/openapi.ts`
- [x] `backend/drizzle/`
- [x] `backend/src/app.ts`
- [x] `backend/package.json`
- [x] `backend/package-lock.json`
- [x] `.gitignore`

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
- [x] Resending verification invalidates previous verification tokens.

## Steps
1. Add auth tables and a committed migration.
2. Add provider-neutral email sender ports with a test/no-op adapter.
3. Add validation, repository, service, controller, routes, and authentication middleware.
4. Add colocated endpoint tests against disposable Postgres.
5. Register the feature in the app and generated API documentation.

## Acceptance criteria
- [x] All nine auth endpoints use the standard response envelope.
- [x] Register, verify, login, refresh, logout, logout-all, forgot-password, and reset-password flows pass end to end.
- [x] Every endpoint has happy-path, validation-failure, and applicable auth-failure coverage.
- [x] The fresh migration set applies successfully before tests run.

## Dependency justifications

- `jsonwebtoken`, `bcryptjs`, and `express-rate-limit`: required for JWT sessions, password hashing, and public auth abuse protection.
- `@asteasolutions/zod-to-openapi`, `swagger-ui-express`, and `@types/swagger-ui-express`: generate and serve the documented auth contract from the existing Zod schemas.

## Security checklist (delete lines that don't apply)
- [x] External input validated
- [x] Parameterized queries only
- [x] Auth checked in middleware
- [x] Rate limited if public endpoint

## Understanding note
Why this works:
The feature owns its tables and persistence operations, the service owns authentication rules, and middleware owns request authentication. Raw credentials and tokens never reach logs or storage, and disposable Postgres verifies the schema and token lifecycle together. And the API docs generated directly from the schemas.
