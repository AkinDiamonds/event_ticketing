# Decisions log

Append-only. Never edit or delete a past entry — if a decision is reversed, add a new entry that supersedes it and link back to the old one.

## Template
## YYYY-MM-DD — [Decision title]
**Context:** [What problem forced this decision]
**Decision:** [What was chosen]
**Alternatives considered:** [What else was on the table, and why it was rejected]
**Status:** Active

---


## 2026-09-09 — Drizzle as the ORM
**Context:** Node + Postgres needed a query/migration layer, and the project is being built on top of an existing reference repo that already used one.
**Decision:** Drizzle.
**Alternatives considered:** Prisma (a strong default for Postgres, but not what the reference repo used — no reason to diverge from working conventions for a project not yet started); Sequelize, TypeORM, Knex, raw `pg` queries (all rejected — no advantage over sticking with the reference repo's existing choice).
**Status:** Active


## 2026-09-09 — Passwordless magic-link login
**Context:** Wanted the lowest-friction login possible for students who just want to buy a ticket fast.
**Decision:** Email-only login — request a magic link, click it, get a session. No password to create or remember.
**Alternatives considered:** Email + password (rejected at the time — an extra field felt like friction); phone/OTP (rejected — per-message SMS cost); Google sign-in (rejected — OAuth setup overhead for an MVP).
**Status:** Superseded by [2026-09-09 — Switch to email + password login](#2026-09-09--switch-to-email--password-login)


## 2026-09-09 — Switch to email + password login
**Context:** In practice, magic links mean re-visiting the email inbox every time a session expires or a device is logged out, and browsers already autofill saved passwords — password login turned out to be the actually-smoother path, not the friction it first looked like.
**Decision:** Email + password, with JWT access/refresh tokens and a proper forgot/reset-password flow (which a magic-link system gets for free but a password system has to build deliberately).
**Alternatives considered:** Keep magic links (rejected — the login-friction problem it solves is smaller in practice than the re-authentication friction it causes); phone/OTP, Google sign-in (rejected for the same reasons as before).
**Supersedes:** [2026-09-09 — Passwordless magic-link login](#2026-09-09--passwordless-magic-link-login)
**Status:** Active


## 2026-09-09 — Tickets require no verification step at signup
**Context:** Wanted signup to be as smooth as possible, with zero steps between registering and being able to use the app.
**Decision:** No email verification. An account is usable the instant it's created.
**Alternatives considered:** Link-based verification, code-based (OTP) verification — both rejected at the time as unnecessary friction for an MVP.
**Status:** Superseded by [2026-09-09 — Require email verification before checkout or creating an event](#2026-09-09--require-email-verification-before-checkout-or-creating-an-event)


## 2026-09-09 — Require email verification before checkout or creating an event
**Context:** An unverified email means a ticket code — the buyer's only proof of entry — can be sent into the void with no way to recover it, and an organizer with a dead email can't be reached about their own event.
**Decision:** Add email verification, but gate it narrowly: buying a ticket and creating an event require a verified email; registering, logging in, and browsing do not. Registering still returns a usable session immediately — verification runs in the background, not as a blocking step.
**Alternatives considered:** Full verification gate on every action (rejected — kills the low-friction browsing experience for no real benefit); OTP-code verification instead of a link (rejected — link reuses the same token pattern already built for password reset, at zero extra implementation cost).
**Supersedes:** [2026-09-09 — Tickets require no verification step at signup](#2026-09-09--tickets-require-no-verification-step-at-signup)
**Status:** Active


## 2026-09-09 — Paystack for payments
**Context:** Needed a payment gateway covering how Nigerian students actually pay — cards, bank transfer, Opay, USSD.
**Decision:** Paystack.
**Alternatives considered:** Flutterwave, Monnify (both viable, rejected only because Paystack is the more common default for Nigerian student/indie projects with equally solid docs and webhook support).
**Status:** Active


## 2026-09-09 — Paystack webhook, not the frontend redirect, is the source of truth for payment success
**Context:** A frontend "payment successful" redirect can be spoofed or can fire before the payment actually clears — trusting it directly would let someone claim a ticket without paying.
**Decision:** Only a webhook-verified, server-to-server-confirmed (`transaction/verify/:reference`) payment marks an order paid and generates tickets. The frontend redirect just triggers a status poll.
**Alternatives considered:** Trusting the frontend's post-checkout callback directly (rejected — trivially spoofable); polling only, no webhook (rejected — slower confirmation, worse UX).
**Status:** Active


## 2026-09-09 — Cloudinary for event banner images
**Context:** Event banners need to be stored somewhere that survives redeploys — the container's own filesystem does not.
**Decision:** Cloudinary, using a signed upload preset so images go client → Cloudinary directly, never through the backend.
**Alternatives considered:** Storing uploads on local disk (rejected — not persistent across deploys on any of the hosting options being considered).
**Status:** Active


## 2026-09-09 — Tickets are anonymous; a code alone is proof of ownership
**Context:** Wanted buying tickets for friends to be trivial, and wanted checkout and check-in to both be as smooth as possible — a name-matching requirement complicates both without a clear MVP benefit.
**Decision:** No name is ever stored on a ticket. A unique, unguessable 6-character code is the entire proof a ticket is valid, and it becomes unusable the moment it's checked in once.
**Alternatives considered:** Binding each ticket to an attendee name and checking it at the door (rejected — adds friction to both checkout and check-in, and doesn't meaningfully improve security since the check would only ever be a spoken, human one, not backend-enforced); requiring ID at the door (rejected — out of scope, no backend role to play).
**Status:** Active


## 2026-09-09 — Money is always an integer in kobo, never a float
**Context:** Standard defensive practice for any system that handles real payments — floating-point arithmetic on currency values silently produces rounding errors.
**Decision:** Every price, total, and amount is stored and calculated as an integer in kobo.
**Alternatives considered:** Storing as a decimal/float column (rejected outright — this is a well-known class of bug, not a real trade-off).
**Status:** Active


## 2026-09-09 — Production hosting on a small paid tier, not a free one
**Context:** Wanted zero-cost hosting that's Docker-native and never sleeps. Initial research into Koyeb's free tier claimed it met this bar; on closer verification, Koyeb's free web service does scale to zero after an hour idle (undocumented in the source first checked), and its free Postgres tier caps active compute at 5 hours/month — neither is viable for continuous production traffic, let alone the exact moment guests are queuing at a door.
**Decision:** Run on a small paid tier (Fly.io, Railway, or Render's paid plan — functionally equivalent for this purpose) for production. Free tiers remain fine for local development and staging.
**Alternatives considered:** Oracle Cloud's Always Free tier (genuinely free forever and always-on, but a fully self-managed VM — more ongoing ops work than a two-to-three-person student team wants to take on); Koyeb free tier + a keep-alive ping to dodge the idle timeout (rejected — still leans on a free tier explicitly documented as not for production, and doesn't solve the 5-hour database compute cap at all).
**Status:** Active


## 2026-09-09 — WhatsApp ticket delivery: build now, ship dark until Meta approves
**Context:** Wanted ticket codes deliverable straight to WhatsApp for convenience. Turns out this isn't free — Meta bills business-initiated messages (a "utility" template, since it's tied to a purchase) at roughly $0.007–0.0145 per message to a Nigerian number — and requires a Meta Business verification with an unpredictable approval timeline.
**Decision:** Build the WhatsApp sending code now, gated behind a `WHATSAPP_ENABLED` env flag that defaults to off. Email is the only channel the system guarantees for MVP; WhatsApp activates the moment Meta approval comes through, with no further deploy needed.
**Alternatives considered:** Waiting to build WhatsApp support until after approval (rejected — no reason to block the feature's code on an external approval timeline outside the team's control); routing around the cost via user-initiated "service conversations" only (rejected — requires the buyer to message first, adding friction the whole feature was meant to remove).
**Status:** Active


## 2026-09-09 — Dropped the shared frontend-secret header
**Context:** The reference repo includes a `requireFrontendSecret` middleware requiring every request to carry a shared secret header, on top of user JWTs.
**Decision:** Removed. Any secret embedded in a public frontend's network requests is trivially extractable by anyone who opens dev tools, so it adds setup friction without real protection.
**Alternatives considered:** Keeping it as a minor speed bump against casual scraping (initially recommended, then rejected once weighed against the near-zero real security it provides for a project already migrating a lot of code from the reference repo).
**Status:** Active


## 2026-09-09 — Response envelope: `{ success, statusCode, message, data }`, not `{ data, error }`
**Context:** A generic conventions template defaulted to a leaner `{ data, error }` response shape, but the reference repo already implements the richer envelope, and it's already written into the technical documentation.
**Decision:** Keep the existing `{ success, statusCode, message, data }` / `{ success, statusCode, message, errors }` envelope everywhere.
**Alternatives considered:** Switching to `{ data, error }` (rejected — this touches literally every endpoint in the system; reversing it later would be far more expensive than any consistency benefit gained now, on a project that hasn't shipped yet).
**Status:** Active


## 2026-09-09 — Validation failures return 422, not 400
**Context:** Same conventions-template conflict as above — the template's generic default was 400 for validation errors.
**Decision:** Keep `ValidationError → 422`, since it was already implemented and documented, and 422 ("well-formed request, invalid content") is the more semantically correct code for a failed schema validation anyway.
**Alternatives considered:** 400, per the generic template (rejected — less precise, and would require a doc + code change for no real benefit).
**Status:** Active


## 2026-09-09 — Tests are colocated per feature, not in a separate `tests/` folder
**Context:** The technical documentation originally specified a top-level `tests/` folder mirroring the `features/` structure; a later conventions template called for colocated `<feature>.test.ts` files instead.
**Decision:** Colocated tests, directly inside each feature's own folder.
**Alternatives considered:** The separate mirrored `tests/` folder (rejected — nothing was built yet, so the switching cost was just a documentation edit, and colocation means one less folder to mentally map every time a feature is added).
**Status:** Active


## 2026-09-09 — Cross-feature imports go through a barrel file only
**Context:** Features genuinely need to call each other (an order has to reserve ticket-tier inventory and create tickets), but reaching directly into another feature's repository or controller breaks the point of having separate feature folders at all.
**Decision:** Every feature exposes an `index.ts` barrel file exporting only the specific functions other features are allowed to call. All cross-feature access goes through that file — nothing else.
**Alternatives considered:** A full internal API/event-bus layer between features (rejected — real overkill for a project this size); no enforced boundary at all (rejected — this is exactly how a feature-folder structure quietly degenerates into a tangle).
**Status:** Active


## 2026-09-09 — Squash-merge only, with branch protection on `main`
**Context:** Wanted every merged plan to correspond cleanly to exactly one commit in `main`'s history, and wanted "no unreviewed merges" to be an enforced rule, not an honor-system one.
**Decision:** Squash-merge every PR. `main` requires at least one approving review before merge is possible.
**Alternatives considered:** Merge commits (rejected — preserves noisy in-progress commit history for no benefit once a PR is approved); rebase (rejected — more ceremony than a small team needs). "Tests must pass" is intentionally *not* yet an enforced branch-protection rule, since no CI workflow exists to generate that status check — see the CI gap noted in `CONVENTIONS.md`.
**Status:** Active

---

## 2026-09-09 - Disposable Postgres verification and explicit migrations
**Context:** Schema changes need to be reproducible while the project is built from scratch, without connecting CI to a production database that does not exist yet.
**Decision:** Every schema-changing plan commits generated Drizzle migrations. Local verification and CI start a disposable Docker Postgres instance, apply all migrations from zero, run the checks, and tear the database down even after failure. The application never runs migrations on startup; production migration execution will be explicit when deployment is introduced.
**Alternatives considered:** `drizzle-kit push` as the verification path (rejected because it does not prove committed migration history); connecting CI to production (rejected because production is not configured and must never be mutated by ordinary CI).
**Status:** Active

---

## 2026-09-09 - Inventory reservations before Paystack checkout
**Context:** A stock check before Paystack is not enough: two pending checkouts can pass it, and an abandoned checkout can permanently block tickets if inventory is consumed too early.
**Decision:** Orders reserve inventory atomically before Paystack initialization. Ticket tiers track `quantityReserved` alongside `quantitySold`; the invariant is `quantitySold + quantityReserved <= quantityAvailable`. Reservations expire after a bounded, configurable period (15 minutes by default), and failed or expired orders release them. Verified payment converts a reservation to sold inventory.
**Alternatives considered:** Consuming inventory only in the webhook (rejected because pending orders can oversell); consuming inventory permanently at checkout (rejected because abandoned/failed payments would lose stock); adding a queue now (rejected as unnecessary for the MVP).
**Status:** Active

---

## 2026-09-09 - Preserve late verified payments as payment exceptions
**Context:** Paystack may confirm a payment after a reservation expires or after another transaction takes the remaining inventory. Marking that order simply failed would hide a real payment and make reconciliation impossible.
**Decision:** A verified payment that cannot be fulfilled becomes `payment_exception`, retains its Paystack reference and payment details, creates no oversold tickets, and is surfaced for operational reconciliation. Paystack may support refunds, but refund eligibility, settlement timing, fees, and execution are provider/account-dependent and are not assumed by the backend MVP.
**Alternatives considered:** Marking the order failed (rejected because it misrepresents a confirmed payment); creating tickets anyway (rejected because it violates inventory truth); implementing automatic refunds now (rejected because the provider/account policy is not settled and refunds are an operational follow-up).
**Status:** Active

---

## 2026-09-09 - Backend and frontend use separate branches
**Context:** The backend is developed from `main`, while the frontend is developed on `ayyub_Frontend`.
**Decision:** Backend plans touch only the backend repository and its root documentation. The frontend consumes the documented API/OpenAPI contract and is not included in backend plan scopes. Completed plan work may be split into coherent commits before review; agents do not commit or push automatically.
**Alternatives considered:** Coordinating one shared branch (rejected because it couples independent work and makes plan ownership unclear).
**Status:** Active
