# Plan 06 - Check-in

## Goal
Provide an organizer-only door endpoint that atomically redeems a valid ticket code once and gives specific responses for used, missing, or out-of-scope codes.

## Files touched
- [x] `backend/src/features/tickets/tickets.service.ts`
- [x] `backend/src/features/tickets/tickets.controller.ts`
- [x] `backend/src/features/tickets/tickets.schemas.ts`
- [x] `backend/src/features/tickets/tickets.test.ts`
- [x] `backend/src/features/events/events.routes.ts` ← route registered here, not a new tickets router

## Out of scope - do NOT touch
- [ ] Multi-staff accounts, per-staff identity tracking, ticket transfers, or QR formats beyond the code payload
- [ ] Event time-window enforcement (see Future Enhancements)
- [ ] Frontend branch `ayyub_Frontend`
- [ ] `backend/src/app.ts` — no new router mount needed; route goes on the existing events router

---

## Decisions & rationale

### Route
`POST /events/:eventId/check-in` — registered on `events.routes.ts`.
Body: `{ code: string }`. The organizer always operates in the context of a specific event; `eventId` belongs in the path.

### Input validation (Zod)
Transform `code` to uppercase first, then validate with exact regex:
```
z.string().toUpperCase().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
```
Malformed codes are rejected 422 before touching the DB. Lowercase input (e.g. `abc123`) is coerced to `ABC123` and matched normally.
Alphabet: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 chars — no ambiguous I/O/0/1, matches `generateCode()` in `payments.service.ts`).

### Atomicity — single-query UPDATE
```sql
UPDATE tickets
SET status = 'used', checked_in_at = now()
WHERE code = $1
  AND status = 'valid'
  AND EXISTS (
    SELECT 1 FROM orders o
    JOIN events e ON e.id = o.event_id
    WHERE o.id = tickets.order_id
      AND e.id = $2
      AND e.organizer_id = $3
  )
RETURNING id, code, checked_in_at, ticket_tier_id
```
- 1 row returned → **200** success
- 0 rows returned → run a follow-up read-only query to distinguish:
  - ticket not found OR wrong event → **404**
  - ticket found but `status = 'used'` → **409**
- No `SELECT FOR UPDATE` needed — Postgres row-level locking on the UPDATE is sufficient and cheaper.

### Ownership & 404 hiding
The EXISTS subquery chains `ticket → order → event WHERE organizer_id = req.user.id AND event.id = :eventId`.
A code from another organizer's event returns **404** (same as nonexistent) — existence is never leaked as a 403.

### 409 response shape
Reuses existing `ConflictError` with the `errors` array — no new error class needed:
```ts
new ConflictError("Ticket already checked in", [
  { code: "TICKET_USED", checked_in_at: ticket.checkedInAt }
])
```
The frontend parses `errors[0].checked_in_at` to display e.g. "Already scanned at 3:00 PM".

### Success `data` shape (flat)
```json
{
  "code": "XKQR7T",
  "tierName": "VIP",
  "checkedInAt": "2026-09-22T16:00:00.000Z"
}
```

### DB schema — no migration needed
`checkedInAt TIMESTAMPTZ` (nullable) and `UNIQUE("code")` already exist on the `tickets` table
(`0002_quiet_terror.sql`). The UNIQUE constraint doubles as the index for fast O(log n) code lookups at scale.

### Rate limiting
IP-based, **300 req/min** per IP, `skip: () => env.NODE_ENV === 'test'`.
Rationale: organizers may share a single account — per-user keying would throttle all door staff on the same login collectively. IP-based with a generous limit stops runaway clients (e.g. buggy frontend loop) without blocking legitimate concurrent scanning.

---

## Edge cases & failure modes

| Scenario | Expected behaviour |
|---|---|
| Nonexistent code | 404 |
| Code belongs to a different organizer's event | 404 (not 403 — existence is hidden) |
| Code is valid and unused | 200 with flat data payload |
| Code already used | 409 with `errors[0].checked_in_at` |
| Two simultaneous scans of the **same** code | Exactly one 200, exactly one 409 — DB atomicity guarantees no double-entry |
| Two staff scanning **different** codes simultaneously | Both succeed in parallel — no contention (different rows) |
| Malformed / wrong-length code | 422 from Zod before DB is touched |
| Lowercase code input (e.g. `abc123`) | Coerced to `ABC123`, validated normally |
| Non-organizer user | 403 from `requireOrganizer` middleware |
| Valid organizer but wrong `eventId` | 404 |

---

## Steps
1. [x] Add `checkInBodySchema` and `eventIdParamSchema` to `tickets.schemas.ts`.
2. [x] Add `checkInTicket(eventId, organizerId, code)` to `tickets.service.ts` — single atomic UPDATE, then conditional read to produce the right error.
3. [x] Add `checkIn` controller handler to `tickets.controller.ts`.
4. [x] Register `POST /:eventId/check-in` on `events.routes.ts` behind `authenticate`, `requireOrganizer`, rate limiter, and `validate`.
5. [x] Write tests in `tickets.test.ts`: 200 path, 404 (nonexistent), 404 (wrong event), 409 (already used), 422 (bad code), 403 (non-organizer), concurrency (`Promise.all` → assert exactly 1×200 + 1×409).

---

## Acceptance criteria
- [x] Successful check-in returns `{ success: true, data: { code, tierName, checkedInAt } }`.
- [x] All error details are under `errors`, never unwrapped.
- [x] Double-scan `Promise.all` concurrency test passes against Postgres.
- [x] Lowercase code input is accepted and coerced — not rejected.
- [x] A code from a different organizer's event returns 404, not 403.

---

## Security checklist
- [x] External input validated (Zod: uppercase transform + exact regex)
- [x] Parameterized queries only (Drizzle ORM)
- [x] Auth checked in middleware (`authenticate` + `requireOrganizer`)
- [x] Rate limited — IP-based, 300 req/min, skipped in test env

---

## Future enhancements (deferred — do NOT implement now)
- **Event time-window enforcement**: Reject check-ins outside `[event.start - Xh, event.end + Yh]`.
  Currently deferred — organizers are trusted not to scan before the event starts or well after it ends.
  Requires `start_time` / `end_time` columns on `events` (verify if present before implementing).
- **Per-staff identity tracking**: Log `checked_in_by: userId` on each ticket scan.
  Deferred until multi-staff accounts are supported.
- **Per-organizer rate limiting**: Switch from IP-based to user-ID-based `keyGenerator`
  once organizers are required to have individual accounts per door staff member.
- **Ticket transfer support**: Allow a buyer to reassign a ticket before check-in.
  Out of scope for this plan.
- **QR code format changes**: If QR codes ever embed metadata beyond the raw 6-char code
  (e.g. event ID prefix, version byte), update the Zod schema accordingly.

---

## Understanding note (fill in AFTER, in your own words)
Why this works:
The ownership join hides tickets from other events, and the conditional state transition
(`WHERE status = 'valid'`) makes redemption safe even when two scans arrive together —
Postgres lets exactly one UPDATE win per row, and the loser sees zero rows returned.

