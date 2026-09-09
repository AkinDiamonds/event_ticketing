# Plan 06 - Check-in

## Goal
Provide an organizer-only door endpoint that atomically redeems a valid ticket code once and gives specific responses for used, missing, or out-of-scope codes.

## Files touched
- [ ] `backend/src/features/tickets/tickets.service.ts`
- [ ] `backend/src/features/tickets/tickets.controller.ts`
- [ ] `backend/src/features/tickets/tickets.router.ts`
- [ ] `backend/src/features/tickets/tickets.schemas.ts`
- [ ] `backend/src/features/tickets/tickets.test.ts`
- [ ] `backend/src/app.ts`

## Out of scope - do NOT touch
- [ ] Multi-staff accounts, identity checks, ticket transfers, or QR formats beyond the code payload
- [ ] Frontend branch `ayyub_Frontend`

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] A code from another organizer's event returns 404, not 403.
- [ ] A nonexistent code returns 404.
- [ ] A used code returns 409 with its prior check-in time.
- [ ] Concurrent scans allow exactly one success.
- [ ] Non-organizers receive 403 from middleware.

## Steps
1. Add validated check-in schemas and route middleware.
2. Query through ticket, order, and event ownership.
3. Conditionally update valid tickets to used with a UTC timestamp.
4. Add concurrent and failure-path tests.

## Acceptance criteria
- [ ] Successful check-in returns the standard envelope.
- [ ] Error details are under `errors`, never an unwrapped response.
- [ ] Double-scan concurrency test passes against Postgres.

## Security checklist (delete lines that don't apply)
- [ ] External input validated
- [ ] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
The ownership join hides tickets from other events, and the conditional state transition makes redemption safe even when two scans arrive together.
