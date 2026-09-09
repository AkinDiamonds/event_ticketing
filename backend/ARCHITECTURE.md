# Architecture

Snapshot of how the system is built right now, and why. If this file and the code disagree, the code is right and this file is stale — fix it in the same PR that caused the drift.

## System summary
Event Ticketing's backend is an API for a student event ticketing platform: students browse and buy tickets to campus parties (possibly across multiple tiers, possibly for friends), and organizers create events and check people in at the door using anonymous, single-use codes. One account type — any user becomes an organizer the moment they create their first event.

## Components
```
[Client] -> [Routes] -> [Controller] -> [Service] -> [Repository] -> [Postgres]
                                              |
                                              +--> Paystack (payment initialization + webhook verification)
                                              +--> Cloudinary (event banner image uploads)
                                              +--> Email provider (verification, password reset, ticket codes)
                                              +--> WhatsApp Cloud API (built, flagged off until Meta approval)
```
No cache and no background job queue exist in this system today. Don't add either box to this diagram speculatively — add it the day a PR actually introduces one.

The backend is developed from `main`; the frontend is developed separately on `ayyub_Frontend` and consumes the backend's documented/OpenAPI contract.

## Data flow (example: an authenticated request)
1. Request hits `<feature>.routes.ts`, passes through the `authenticate` middleware (and `requireOrganizer` if the route needs it).
2. Body/query/params are validated against `<feature>.schemas.ts` before the controller runs.
3. `<feature>.controller.ts` stays thin — it parses the request and hands off to the service.
4. `<feature>.service.ts` applies business rules, and if it needs another feature's data, it goes through that feature's `index.ts` barrel — never straight into another feature's repository or controller.
5. `<feature>.repository.ts` is the only layer allowed to talk to Postgres.

For the payment-specific flow (checkout → Paystack → webhook → ticket generation), see `backend-technical-documentation.md`, Section 9 — it's the one flow in this system with enough moving parts to deserve its own walkthrough rather than a summary here.

## Key decisions (summary — full reasoning lives in DECISIONS.md)
- Feature-based folders, one feature = one directory, cross-feature access only through each feature's `index.ts` barrel.
- Email + password auth, not magic links — with JWT access/refresh tokens, rotated on every refresh.
- Email verification is required to buy a ticket or create an event, but not to log in or browse — verification gates the two actions where an unreachable inbox is actually a problem.
- A ticket code is the entire proof of ownership. No name is stored or checked against a ticket, by design.
- Money is stored as an integer in kobo everywhere, never a float.
- The Paystack webhook, independently verified server-to-server, is the source of truth for payment success — never the frontend's post-checkout redirect.
- Checkout reserves inventory atomically with `quantitySold + quantityReserved <= quantityAvailable`; reservations expire after a bounded configurable period, and verified payments that cannot be fulfilled become `payment_exception` for reconciliation.
- Every schema-changing plan commits migrations. Local and CI verification applies migrations to disposable Docker Postgres from zero; the app does not migrate on startup and CI never touches production.
- Hosting runs on a small paid tier rather than a free one, specifically to avoid a cold start during live door check-in.
- WhatsApp delivery is built and wired in, but stays behind a feature flag until the Meta business account is approved — email is the only channel this system currently guarantees.

## Rule
Any plan that changes a component, a data flow, or a key decision must update this file in the same PR. A wrong architecture doc is more dangerous than no architecture doc at all — it makes every future agent and teammate confidently wrong.
