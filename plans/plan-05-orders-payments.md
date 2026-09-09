# Plan 05 - Orders, Payments, Reservations, and Tickets

## Goal
Implement checkout and verified Paystack fulfillment without overselling or losing paid orders. Inventory is reserved transactionally, released on failure/expiry, and converted to sold inventory only after server-to-server payment verification.

## Files touched
- [ ] `backend/src/features/orders/`
- [ ] `backend/src/features/payments/`
- [ ] `backend/src/features/tickets/`
- [ ] `backend/src/db/schema.ts`
- [ ] `backend/src/db/migrations/`
- [ ] `backend/src/app.ts`

## Out of scope - do NOT touch
- [ ] Refund execution UI or automatic refund policy
- [ ] Notification delivery implementation
- [ ] Check-in behavior
- [ ] Background queues or workers

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] Atomic reservation maintains `quantitySold + quantityReserved <= quantityAvailable`.
- [ ] Abandoned reservations expire after configurable bounded time, default 15 minutes.
- [ ] Paystack initialization failure releases the reservation and marks the order failed.
- [ ] Duplicate webhook delivery creates no duplicate tickets.
- [ ] Invalid webhook signatures and mismatched verified amounts are rejected.
- [ ] Verified payment after expiry or unavailable stock becomes `payment_exception`, never an ordinary failure.
- [ ] Ticket codes are unique six-character values from the fixed unambiguous alphabet.
- [ ] Cleanup is idempotent and transaction-safe.

## Steps
1. Add orders, tickets, reservation fields, statuses, and migrations.
2. Reserve inventory and create a pending order in one database transaction.
3. Initialize Paystack after commit; release and fail safely if initialization fails.
4. Verify webhook signature and transaction independently, then fulfill idempotently.
5. Add explicit reservation cleanup/reset scripts without a background worker.
6. Add colocated concurrency, duplicate-webhook, expiry, amount, and code-generation tests.

## Acceptance criteria
- [ ] Concurrent checkout cannot reserve more than available inventory.
- [ ] Verified payment creates exactly one ticket set and moves reserved quantity to sold.
- [ ] Expired or failed reservations are released.
- [ ] A late verified payment is preserved as `payment_exception` for operational reconciliation.
- [ ] Orders expose a pollable status through the standard response envelope.
- [ ] Paystack refund handling is documented as an operational/provider-dependent follow-up, not silently assumed.

## Security checklist (delete lines that don't apply)
- [ ] External input validated
- [ ] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
The database owns inventory truth, Paystack owns payment processing, and the webhook is independently verified before fulfillment. Reservation expiry prevents abandoned checkout from blocking stock, while `payment_exception` prevents a confirmed payment from disappearing when inventory can no longer be fulfilled.
