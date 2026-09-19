# Plan 05 - Orders, Payments, Reservations, and Tickets

## Goal
Implement checkout and verified Paystack fulfillment without overselling or losing paid orders. Inventory is reserved transactionally, released on failure/expiry, and converted to sold inventory only after server-to-server payment verification.

## Files touched
- [ ] `backend/src/config/env.ts`
- [ ] `backend/src/db/schema.ts`
- [ ] `backend/src/db/migrations/`
- [ ] `backend/src/features/orders/orders.schema.ts`
- [ ] `backend/src/features/orders/orders.schemas.ts`
- [ ] `backend/src/features/orders/orders.repository.ts`
- [ ] `backend/src/features/orders/orders.service.ts`
- [ ] `backend/src/features/orders/orders.controller.ts`
- [ ] `backend/src/features/orders/orders.routes.ts`
- [ ] `backend/src/features/orders/index.ts`
- [ ] `backend/src/features/payments/payments.service.ts`
- [ ] `backend/src/features/payments/payments.controller.ts`
- [ ] `backend/src/features/payments/payments.routes.ts`
- [ ] `backend/src/shared/middleware/require-organizer.ts`
- [ ] `backend/src/app.ts`
- [ ] `backend/src/features/orders/orders.test.ts`
- [ ] `backend/src/features/payments/payments.test.ts`

## Out of scope - do NOT touch
- [ ] Refund execution UI or automatic refund policy
- [ ] Notification delivery implementation
- [ ] Check-in behavior
- [ ] Background queues or workers

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] Atomic reservation maintains `quantitySold + quantityReserved <= quantityAvailable` using SQL expressions (`sql` template literal) to prevent race conditions during concurrent checkouts.
- [ ] Abandoned reservations expire after configurable bounded time (default 15 minutes via `ORDER_RESERVATION_MINUTES`).
- [ ] Paystack initialization failure (network/provider error) releases the inventory reservation in a transaction and marks the order status as `failed`.
- [ ] Duplicate webhook delivery is handled idempotently; if order status is already `paid`, duplicate webhooks return `200 OK` without creating duplicate tickets.
- [ ] Raw request body is captured specifically for the webhook route (`/api/v1/payments/webhook`) to enable HMAC-SHA512 signature verification via `crypto.timingSafeEqual`.
- [ ] Webhook handler responds `200 OK` immediately after signature verification to avoid Paystack timeout/replays before performing independent verification (`GET https://api.paystack.co/transaction/verify/:reference`).
- [ ] Mismatched verified amount or verified payment received after reservation expiry converts order status to `payment_exception` (never silently ignored or marked standard failed) for operational reconciliation.
- [ ] Ticket codes are globally unique six-character uppercase values generated using `crypto.randomBytes` from the fixed 32-character unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`).
- [ ] Admin cleanup endpoint `POST /api/v1/orders/admin/cleanup-expired` allows organizers/admins to release expired reservations without a background job worker.
- [ ] Orders expose pollable status and details only to the owning buyer or authorized roles, preventing cross-user information leakage.

## Steps
1. Add `ORDER_RESERVATION_MINUTES` to `env.ts`.
2. Create Drizzle schemas for `orders`, `order_items`, `tickets`, and `order_status` & `ticket_status` enums in `orders.schema.ts`; register in `db/schema.ts` and generate migrations (`npm run db:generate && npm run db:migrate`).
3. Define request/parameter Zod validation schemas in `orders.schemas.ts`.
4. Create `orders.repository.ts` with atomic transaction helpers (`createOrderWithReservation`, `fulfillOrder`, `releaseReservation`, `getExpiredPendingOrders`, `findOrderByReference`).
5. Create `orders.service.ts` for checkout orchestration, Paystack initialization, order status retrieval, and reservation cleanup.
6. Create `orders.controller.ts` and `orders.routes.ts` with rate limiting on `/checkout` and auth middleware.
7. Create `shared/middleware/require-organizer.ts` for organizer/admin route authorization.
8. Add `cleanupExpired` route to `orders.routes.ts` (`POST /admin/cleanup-expired`).
9. Create `payments.service.ts` with HMAC-SHA512 raw body verification (`verifyWebhookSignature`) and `handleChargeSuccess` independent verification flow.
10. Create `payments.controller.ts` and `payments.routes.ts` handling raw body payload and immediate `200 OK` response.
11. Update `app.ts` to configure conditional raw body parsing for `/api/v1/payments/webhook` before `express.json()` and mount orders/payments routers.
12. Create colocated tests: `orders.test.ts` (concurrency inventory protection, Paystack failure cleanup, authorization) and `payments.test.ts` (signature validation, duplicate webhook idempotency, amount mismatch, reservation expiry).

## Acceptance criteria
- [ ] Concurrent checkout cannot reserve more than available inventory.
- [ ] Verified payment creates exactly one ticket set and moves reserved quantity to sold.
- [ ] Expired or failed reservations are released.
- [ ] A late verified payment is preserved as `payment_exception` for operational reconciliation.
- [ ] Orders expose a pollable status through the standard response envelope.
- [ ] Paystack refund handling is documented as an operational/provider-dependent follow-up, not silently assumed.
- [ ] `npm run verify` passes with clean disposable Postgres.

## Security checklist (delete lines that don't apply)
- [ ] External input validated (Zod schemas for body & params, raw Buffer for webhook)
- [ ] Parameterized queries only (Drizzle ORM & `sql` template parameters)
- [ ] Auth checked in middleware (`authenticate` for user routes, `requireOrganizer` for admin cleanup, HMAC signature verification for webhooks)
- [ ] Rate limited if public endpoint (`checkoutRateLimiter` 10 reqs / 15 min)

## Understanding note (fill in AFTER, in your own words)
Why this works:
The database owns inventory truth, Paystack owns payment processing, and the webhook is independently verified before fulfillment. Reservation expiry prevents abandoned checkout from blocking stock, while `payment_exception` prevents a confirmed payment from disappearing when inventory can no longer be fulfilled.

