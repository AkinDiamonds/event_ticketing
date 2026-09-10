# LASU Party Tickets — Backend Technical Documentation

This is the single reference for the backend: how it's built, how it works, and how to extend it. If it's not in here or in the OpenAPI spec, it isn't documented yet — add it rather than asking around.

**Scope note:** this describes the MVP. Deliberately cut for v1: refunds, ticket transfers/resale, waitlists, push notifications, multi-staff check-in, per-organizer name-binding on tickets. These are known gaps, not oversights — don't build around their absence, just add them properly when the time comes.

---

## 1. Overview

An event ticketing platform for LASU students to discover parties, buy tickets, and get into the door — and for organizers to list events, sell tickets, and check people in.

**One account type, not two.** Everyone starts as a regular user. A user becomes an organizer automatically the moment they create their first event — there's no separate signup flow or account type to manage.

**Core flows:**
- A student browses events, buys one or more tickets (possibly across different tiers, possibly for friends), and receives a unique code per ticket by email.
- An organizer creates an event, sets one or more ticket tiers with price and quantity, and — at the door — types or scans each guest's code to check them in.
- A ticket code is anonymous. Whoever has a valid, unused code gets in. There is no name check on the backend.

---

## 2. Architecture & Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + Express 5 |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle |
| Validation | Zod |
| API docs | Zod schemas → auto-generated OpenAPI spec → Swagger UI |
| Auth | Email + password, JWT access/refresh pair |
| File storage | Cloudinary (event banner images) |
| Payments | Paystack |
| Email | Transactional email provider (pick one with a solid free tier — Resend or SendGrid both work; not yet locked in, treat as a config value not a hard dependency) |
| WhatsApp | Meta WhatsApp Cloud API — built now, feature-flagged off until Meta approves the business account |
| Containers | Docker + docker-compose (local dev) |
| Hosting | A small paid tier (Fly.io / Railway / Render — any works identically here), chosen over free tiers specifically to avoid cold starts during live check-in |

### Why the OpenAPI spec is the source of truth for endpoints

Every route's request/response shape is defined once, in its Zod schema, and that schema generates both runtime validation and the OpenAPI spec shown in Swagger UI. This document will **not** re-list every field of every endpoint — that lives at `/api/docs` and it's always accurate, because it's generated from the same code that runs. This document covers everything OpenAPI can't: why things work the way they do, the data model, and the business rules.

### Folder structure

Feature-based. Every feature (a resource like `auth`, `users`, `events`, `tickets`, `orders`) follows the same internal shape:

```
src/
  config/              # env validation, db connection, constants, openapi/swagger setup
  db/
    schema.ts           # re-exports every feature's Drizzle schema — always add your export here
  features/
    auth/
      auth.routes.ts     # Express router, wires middleware + controller
      auth.controller.ts # thin — parses req, calls service, sends response
      auth.service.ts    # business logic lives here
      auth.schemas.ts     # Zod input/output schemas
      auth.openapi.ts     # registers the schemas with the OpenAPI doc
      auth.test.ts        # colocated — sits right next to the code it tests
      index.ts             # barrel file: the ONLY things other features may import from this one
    users/
      users.repository.ts # the only layer allowed to talk to the database
      ...
    events/
    tickets/
    orders/
  shared/
    middleware/    # authenticate, requireOrganizer, validate, errorHandler, rateLimiter
    utils/         # errors, response, hash, logger
  app.ts           # Express app, middleware wiring
  server.ts        # entrypoint, starts the HTTP server
```

**Cross-feature imports go through the barrel file only.** If `orders` needs to decrement `ticket_tiers` inventory, it imports from `features/ticket-tiers/index.ts` — never reaches directly into `ticket-tiers.repository.ts` or `.controller.ts`. The barrel exports exactly the functions other features are allowed to call, nothing more. This is enforced by convention (see `CONVENTIONS.md`), not by tooling — a PR reviewer should reject a diff that reaches around a barrel file.

**Rule:** controllers never touch the database directly, and services never touch `req`/`res` directly. If you're tempted to break this, put the logic in the right layer instead.

---

## 3. Getting Started

1. Clone the repo.
2. `cp .env.example .env` and fill in every value (see Section 4).
3. `docker-compose up -d db` — starts Postgres in a container.
4. `npm install`
5. `npm run db:migrate` — applies the schema to your local database.
6. `npm run db:seed` — optional, loads sample events/tickets for local testing.
7. `npm run dev` — starts the API with hot reload.
8. Visit `http://localhost:3000/api/docs` for the live Swagger UI.

---

## 4. Environment Variables Reference

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `development` \| `production` \| `test` |
| `PORT` | Yes | Default `3000` |
| `CORS_ORIGINS` | Yes in prod | Comma-separated list of allowed frontend origins |
| `DATABASE_URL` | Yes | Full Postgres connection string |
| `TEST_DATABASE_URL` | Yes for verification | Disposable Docker Postgres connection used by local/CI tests; never production |
| `JWT_SECRET` | Yes | ≥32 chars, signs access tokens |
| `JWT_EXPIRES_IN` | No | Default `1h` |
| `JWT_REFRESH_SECRET` | Yes | ≥32 chars, signs refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | No | Default `7d` |
| `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES` | No | Default `30` |
| `EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES` | No | Default `1440` (24h) — longer than the password reset window since there's no urgency driving the user to act immediately |
| `PAYSTACK_SECRET_KEY` | Yes | Used server-side to initialize/verify transactions |
| `PAYSTACK_PUBLIC_KEY` | Yes | Handed to the frontend to open the Paystack checkout |
| `CLOUDINARY_CLOUD_NAME` | Yes | |
| `CLOUDINARY_API_KEY` | Yes | |
| `CLOUDINARY_API_SECRET` | Yes | |
| `EMAIL_PROVIDER_API_KEY` | Yes | Whichever transactional email provider is chosen |
| `EMAIL_FROM_ADDRESS` | Yes | e.g. `tickets@yourapp.com` |
| `ORDER_RESERVATION_MINUTES` | No | Default `15`; bounded checkout reservation lifetime |
| `WHATSAPP_ENABLED` | No | Default `false`. Flip to `true` once Meta approves the business account |
| `WHATSAPP_API_TOKEN` | Only if enabled | Meta Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | Only if enabled | Meta-issued sending number ID |
| `ENABLE_SWAGGER` | No | Default `true`. Set `false` to hide `/api/docs` in production if you want |

The app should fail fast on missing required variables — validate them all at startup with Zod, don't discover a missing key three requests in.

---

## 5. Authentication & Authorization

**Email verification is required — but it doesn't block login.** Registering immediately returns a usable token pair, so nobody is stuck staring at a "check your email" screen before they can even look around the app. What verification *gates* is anything where an unverified email would actually cause harm — see the gate rule below.

### Endpoints (full request/response shapes live in Swagger)

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/register` | Email + password → creates a user (`isEmailVerified: false`), returns a token pair, and sends a verification email in the background |
| `POST /api/v1/auth/login` | Email + password → returns a token pair |
| `POST /api/v1/auth/verify-email` | Verification token (from the emailed link) → marks the user verified, invalidates the token |
| `POST /api/v1/auth/resend-verification` | Authenticated, unverified users only → sends a new verification link, invalidating any previous one. Rate-limited so it can't be used to spam an inbox |
| `POST /api/v1/auth/refresh` | Exchanges a valid refresh token for a new pair (rotates the old one out) |
| `POST /api/v1/auth/logout` | Revokes the refresh token for *this* device only |
| `POST /api/v1/auth/logout-all` | Revokes every refresh token for the user — "log out everywhere" |
| `POST /api/v1/auth/forgot-password` | Email → sends a time-limited reset link. Always returns success regardless of whether the email exists, to avoid leaking which emails are registered |
| `POST /api/v1/auth/reset-password` | Reset token + new password → invalidates the token and all existing refresh tokens for that user |

### The verification gate

Being unverified doesn't lock anyone out of the app — it only blocks the two actions where an unreachable email is actually a problem:

- **Buying tickets** — if the email bounces, the buyer never gets their code, and there's no other delivery channel guaranteed to exist (Section 10).
- **Creating an event** (becoming an organizer) — an organizer needs a working email to receive their own sales/order notifications and to be reachable if something goes wrong.

Browsing events, viewing your profile, and everything else works fine unverified. Attempting a gated action while unverified returns a `EmailNotVerifiedError` (see Section 12) — the frontend should treat this as a specific, actionable error ("verify your email to continue"), not a generic failure.

### Token lifecycle

- **Access token**: short-lived (default 1h), sent as `Authorization: Bearer <token>`, checked on every protected route.
- **Refresh token**: long-lived (default 7d), stored server-side (hashed) so it can be revoked, and **rotated on every use** — the old one is deleted the moment a new one is issued, so a stolen-then-reused refresh token is a detectable signal, not a silent compromise.
- Passwords are hashed with bcrypt. Never logged, never returned in any response, ever.

### Authorization

- `authenticate` middleware verifies the access token and attaches `req.user`.
- `requireOrganizer` middleware checks `user.isOrganizer === true`. Applied to: create event, edit event, view an event's orders/sales, and the check-in endpoint.
- There is no separate "staff" role in MVP. If an organizer needs extra hands at the door, they share their login. This is a known limitation, not a bug — build a real staff-invite system when it's actually requested.

---

## 6. Data Models

All tables use UUID primary keys and `createdAt`/`updatedAt` timestamps unless noted. Soft-deletable tables (`users`, `events`) carry a nullable `deletedAt` instead of ever hard-deleting a row that other data may reference.

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `email` | varchar, unique | login identity |
| `passwordHash` | text | bcrypt |
| `isEmailVerified` | boolean, default `false` | flipped to `true` via `/auth/verify-email` |
| `isOrganizer` | boolean, default `false` | flipped to `true` on first event creation |
| `deletedAt` | timestamp, nullable | soft delete |

### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `userId` | uuid, FK → users.id, cascade delete | |
| `token` | text, unique, hashed | |
| `expiresAt` | timestamp | |

### `password_reset_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `userId` | uuid, FK → users.id | |
| `token` | text, unique, hashed | |
| `expiresAt` | timestamp | |
| `usedAt` | timestamp, nullable | set once consumed, prevents replay |

### `email_verification_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `userId` | uuid, FK → users.id | |
| `token` | text, unique, hashed | |
| `expiresAt` | timestamp | |
| `usedAt` | timestamp, nullable | set once consumed, prevents replay |

### `events`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `organizerId` | uuid, FK → users.id | |
| `title` | varchar | |
| `description` | text | |
| `bannerImageUrl` | text, nullable | Cloudinary URL |
| `venue` | varchar | free text for MVP |
| `startsAt` | timestamp | |
| `deletedAt` | timestamp, nullable | organizer "cancels" an event via soft delete |

### `ticket_tiers`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `eventId` | uuid, FK → events.id | |
| `name` | varchar | e.g. "Regular", "VIP" |
| `priceKobo` | integer | store money as an integer (kobo), never a float |
| `quantityAvailable` | integer | |
| `quantityReserved` | integer | default `0`; active pending checkout reservations |
| `quantitySold` | integer, default `0` | incremented atomically at purchase time — see Section 7 |

### `orders`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `buyerId` | uuid, FK → users.id | |
| `eventId` | uuid, FK → events.id | an order is scoped to one event |
| `totalKobo` | integer | |
| `status` | enum | `pending` → `paid` \| `failed` \| `expired` \| `payment_exception` |
| `paystackReference` | varchar, unique | ties the order to a Paystack transaction, and doubles as an idempotency key |
| `reservationExpiresAt` | timestamp | expiry for the pending inventory reservation |

### `tickets`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `orderId` | uuid, FK → orders.id | |
| `ticketTierId` | uuid, FK → ticket_tiers.id | |
| `code` | varchar(6), unique | see generation rules below |
| `status` | enum | `valid` → `used` |
| `checkedInAt` | timestamp, nullable | |

No `attendeeName` column exists anywhere in this schema, on purpose — see Section 7.

---

## 7. Core Business Rules

This section is the part nobody can infer from the code alone — read it before changing anything ticket-related.

### Ticket codes are the entire security model

- A code is **6 characters, uppercase alphanumeric, excluding visually ambiguous characters** (`0`/`O`, `1`/`I`/`L`) — short enough to read aloud or memorize, long enough not to be guessable by brute force at door-scale traffic.
- Codes are generated **one per ticket**, at the moment payment is confirmed, and are unique across the entire system (not just per event).
- **A code is the entire proof of a valid ticket.** No name, phone number, or ID is checked against it by the backend. This is intentional: it's what makes "buy 3 tickets and hand 2 to your friends" work with zero extra steps, and it's a completely standard model for consumer event ticketing.
- A code can only be redeemed once. The moment `check-in` succeeds, `status` flips to `used` and `checkedInAt` is set. Any later attempt with that code — even from the legitimate original buyer — is rejected with a clear "already used" reason, not a generic error.
- If an organizer later wants stricter control (e.g. binding a code to a name for a higher-security event), that's a real v2 feature — an optional per-event setting, not a global change. Don't build it speculatively now.

### Buying tickets

- One order can contain multiple tickets, across multiple tiers, in a single checkout (e.g. 2 Regular + 1 VIP in one purchase).
- Every ticket in the order gets its own independent code the moment payment succeeds. There's no "assign a name to each ticket" step — the buyer can forward any code to anyone.

### Preventing overselling

`quantitySold` must never be allowed to exceed `quantityAvailable`, even under concurrent purchases in the last seconds before a tier sells out. Increment it with an atomic, conditional update inside the same transaction that creates the order — for example:

```sql
UPDATE ticket_tiers
SET quantity_sold = quantity_sold + :qty
WHERE id = :tierId
  AND quantity_sold + :qty <= quantity_available;
```

If this update affects zero rows, the tier didn't have enough stock left — fail the order before it ever reaches Paystack, don't take someone's money for a ticket that doesn't exist.

Before Paystack initialization, checkout instead atomically increments `quantityReserved` while enforcing `quantitySold + quantityReserved + :qty <= quantityAvailable`. A pending reservation expires after `ORDER_RESERVATION_MINUTES` (15 by default). Failed or expired orders release the reservation. On verified payment, fulfillment moves the reserved quantity to `quantitySold` in the same transaction that creates tickets. A cleanup command releases expired reservations; no background worker is required for the MVP.

### Check-in flow

1. Organizer submits a code — either typed manually or read from a scanned QR code (the QR simply encodes the same 6-character code as its payload; there is no separate QR-specific data format).
2. Backend looks up the code, scoped to the organizer's own event (an organizer can't accidentally or deliberately check in a code from someone else's event).
3. If the code doesn't exist, belongs to a different event, or is already `used` → reject with a specific reason.
4. If valid and unused → mark `used`, set `checkedInAt`, return success.

### Order/payment lifecycle

`pending` (order created, redirected to Paystack) → `paid` (webhook confirmed, tickets generated) or `failed` (payment didn't go through, no tickets ever generated, no inventory was permanently consumed — release the reserved stock if you reserve optimistically).

---

## 8. API Reference

Full request/response schemas, validation rules, and example payloads are auto-generated and live at **`/api/docs`** — treat that as canonical. High-level map of what lives where:

| Group | Base path | Who can call it |
|---|---|---|
| Auth | `/api/v1/auth/*` | Public |
| Users | `/api/v1/users/*` | Authenticated |
| Events | `/api/v1/events/*` | Browse: public. Create/edit: organizer only |
| Ticket Tiers | `/api/v1/events/:eventId/tiers/*` | Read: public. Write: organizer only (own events) |
| Orders | `/api/v1/orders/*` | Authenticated (own orders only) |
| Tickets | `/api/v1/tickets/*` | Authenticated (own tickets), check-in restricted to organizer |
| Payments webhook | `/api/v1/payments/webhook` | Paystack only (signature-verified, not user-authenticated) |

---

## 9. Payments (Paystack)

1. Frontend requests checkout for an order → backend validates tiers and atomically reserves inventory, creates an `orders` row (`status: pending`), commits, then calls Paystack's `transaction/initialize` with the amount and a callback URL. It returns the `authorization_url` + `reference` to the frontend.
2. Frontend redirects the user to Paystack's hosted checkout (handles cards, bank transfer, Opay, USSD — whatever the buyer prefers, Paystack abstracts all of it).
3. **The webhook is the source of truth, not the frontend redirect.** When Paystack sends `charge.success` to `POST /api/v1/payments/webhook`:
   - Verify the request signature against `PAYSTACK_SECRET_KEY` before trusting anything in the payload.
   - Independently call Paystack's `transaction/verify/:reference` to confirm the amount and status server-to-server — never trust a webhook body alone for something this important.
  - Only then: if the reservation is still valid, move reserved inventory to sold, mark the order `paid`, generate ticket codes, and trigger notifications.
  - If the reservation expired or inventory cannot be fulfilled, preserve the verified payment as `payment_exception`; never oversell and never silently mark a confirmed payment as an ordinary failure.
4. The frontend's post-checkout redirect page should just poll `GET /api/v1/orders/:id` for status, not assume success from the redirect itself — the webhook may arrive a few seconds later.
5. `paystackReference` is unique on the `orders` table specifically so a webhook that fires twice (Paystack does retry) can't generate duplicate tickets — check for an already-`paid` order and no-op instead of reprocessing.

Paystack may support refunds, but refund eligibility, settlement timing, fees, and execution depend on the Paystack account and transaction state. The MVP preserves `payment_exception` for operational reconciliation; it does not assume or automate refunds.

---

## 10. Notifications

- **Email — always on.** The moment an order is marked `paid`, email every ticket code in that order to the buyer's registered email. This is the only guaranteed delivery channel and must never depend on WhatsApp being available.
- **WhatsApp — built, dormant until approved.** The sending code exists and is called from the same place email is sent, but every call checks `WHATSAPP_ENABLED` first and silently no-ops if `false`. There is no separate "WhatsApp mode" to maintain — flip the env var once Meta approves the business account, and it starts working without a deploy.
- WhatsApp messages sent this way are billed by Meta as **utility template messages** (a small per-message cost to Nigerian numbers, not free) — this is expected and fine at ticket-price scale, but don't be surprised by a line item on the Meta bill.

---

## 11. Image Uploads (Cloudinary)

- Event banner images are uploaded to Cloudinary, not stored on the server's own disk — the container's filesystem is not persistent across deploys, so anything saved locally silently disappears the next time you ship.
- Recommended flow: use a **signed upload preset** so the organizer's browser uploads the image directly to Cloudinary (never passing through your server), and only the resulting URL is sent to the backend to save on the `events` row. This keeps your server's bandwidth and memory out of the upload path entirely.

---

## 12. Error Handling Reference

Every thrown error extends `AppError` and is caught by a single `errorHandler` middleware, which returns the standard `{ success: false, statusCode, message, errors }` envelope.

| Error class | Status | Thrown when |
|---|---|---|
| `ValidationError` | 422 | Request body/params fail Zod validation |
| `UnauthorizedError` | 401 | Missing/invalid/expired token, or wrong password |
| `ForbiddenError` | 403 | Valid token, but not allowed to do this (e.g. non-organizer hitting an organizer route) |
| `EmailNotVerifiedError` | 403 | Attempting to buy a ticket or create an event without a verified email |
| `NotFoundError` | 404 | Resource doesn't exist (or doesn't belong to the requester) |
| `ConflictError` | 409 | Duplicate resource (e.g. email already registered) |
| `AppError` (base) | 500 | Anything unexpected — logged with full detail, never leaked to the client |

Successful responses always use the same envelope: `{ success: true, statusCode, message, data }`.

---

## 13. Security & Rate Limiting

- **CORS**: locked to explicit origins via `CORS_ORIGINS`, required in production (the app refuses to boot without it).
- **Helmet**: standard security headers on every response.
- **Rate limiting**: applied to `auth` routes (register/login/forgot-password/resend-verification) to blunt credential-stuffing, brute-force attempts, and inbox-spamming, and to the checkout endpoint to blunt inventory-exhaustion abuse.
- **No shared frontend secret.** An earlier draft of this app had a shared-secret header required on every request; it was deliberately dropped — it added setup friction without real protection, since any such secret embedded in a public frontend is trivially extractable anyway.
- **Passwords**: bcrypt, never logged, never returned.
- **Refresh tokens**: hashed at rest, rotated on every use, fully revocable via logout-all.

---

## 14. Testing

- Framework: Vitest, with Supertest for HTTP-level tests against the Express app.
- Convention: feature tests are **colocated** — `auth.test.ts` sits directly inside `features/auth/`, next to the code it tests. Foundation smoke tests may remain under `src/tests/` until cleanup.
- Database-backed tests recreate disposable Docker Postgres from committed migrations before verification; CI never connects to production.
- `npm test` — run the suite. `npm run test:coverage` — with coverage report.
- Anything touching money (order creation, webhook handling, inventory decrement) needs a test for the concurrent/duplicate case, not just the happy path — this is the part of the app where a bug costs real money or oversold tickets.

---

## 15. Deployment

1. Build the Docker image (`docker build .`) — the same image runs in every environment, no environment-specific code branches inside the Dockerfile.
2. Deploy to the chosen paid host (Fly.io / Railway / Render — pick one, the steps are equivalent: point it at the Dockerfile, set env vars, deploy).
3. Run `npm run db:migrate` against the production database as part of the deploy step, before the new version starts receiving traffic.
4. Before the first real event goes live, verify:
   - `NODE_ENV=production`
   - `CORS_ORIGINS` set to the real frontend domain
   - Every secret (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `PAYSTACK_SECRET_KEY`, Cloudinary keys) is a real production value, not a local dev placeholder
   - `ENABLE_SWAGGER` — decide deliberately whether `/api/docs` should be public in production or not
5. Because the host is a paid, always-on tier, there's no cold-start risk to worry about during check-in — that was the entire point of not using a free tier. Don't undo that by switching hosts to save a few dollars without re-reading Section 2's reasoning first.

---

## 16. Adding a New Feature

To add a new resource (say, a future `waitlists` feature), follow the exact shape every existing feature uses:

1. `src/features/waitlists/waitlists.schema.ts` — Drizzle table definition.
2. Add `export * from "#features/waitlists/waitlists.schema.js";` to `src/db/schema.ts`.
3. Run `npm run db:generate` then `npm run db:migrate`.
4. `waitlists.schemas.ts` — Zod schemas for request validation.
5. `waitlists.repository.ts` — the only file allowed to query the `waitlists` table.
6. `waitlists.service.ts` — business logic, calls the repository.
7. `waitlists.controller.ts` — thin, calls the service, uses `sendSuccess`/`sendError`.
8. `waitlists.routes.ts` — wires middleware (`authenticate`, `validate`, rate limiters) to controller methods.
9. `waitlists.openapi.ts` — registers the schemas so they show up in Swagger automatically.
10. `index.ts` — the barrel file. Export only the specific functions other features are allowed to call; everything else stays private to this feature.
11. Mount the router in `app.ts`.
12. `waitlists.test.ts` — colocated in `features/waitlists/`, not a separate `tests/` folder.

If a feature doesn't fit this shape, that's a signal to reconsider the design, not to make an exception.
