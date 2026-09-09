# Plan 04 - Events and Ticket Tiers

## Goal
Let verified users create and manage events and ticket tiers, while public users browse active events. Creating the first event promotes the user to organizer.

## Files touched
- [ ] `backend/src/features/events/`
- [ ] `backend/src/db/schema.ts`
- [ ] `backend/src/db/migrations/`
- [ ] `backend/src/shared/middleware/require-organizer.ts`
- [ ] `backend/src/app.ts`

## Out of scope - do NOT touch
- [ ] Orders, Paystack, inventory reservation, ticket generation, check-in, notifications, or uploads
- [ ] Name binding or attendee identity checks
- [ ] Frontend branch `ayyub_Frontend`

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] Unverified users cannot create events.
- [ ] Non-organizers receive 403 on organizer routes.
- [ ] An organizer cannot edit or delete another organizer's event.
- [ ] Soft-deleted events disappear from public reads.
- [ ] Prices are integer kobo and quantities are positive integers.
- [ ] `quantitySold` and `quantityReserved` are not organizer-editable.

## Steps
1. Add event and tier tables, including `quantityReserved`, and commit the migration.
2. Add schemas, repositories, services, controllers, routes, and OpenAPI registration.
3. Add ownership and verification middleware/service checks.
4. Add colocated tests against disposable Postgres.

## Acceptance criteria
- [ ] Public list/detail and organizer CRUD use the standard response envelope.
- [ ] First event creation atomically sets `isOrganizer`.
- [ ] Soft deletion and ownership checks work.
- [ ] Migration-from-zero and `npm run verify` pass.

## Security checklist (delete lines that don't apply)
- [ ] External input validated
- [ ] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
Public reads stay separate from organizer mutations, and ownership is enforced at the route/service boundary before event data is changed.
