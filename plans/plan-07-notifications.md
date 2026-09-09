# Plan 07 - Notifications

## Goal
Send paid ticket codes by email and provide a WhatsApp path behind `WHATSAPP_ENABLED`, without allowing either delivery channel to alter payment truth or prevent the other from running.

## Files touched
- [ ] `backend/src/features/notifications/`
- [ ] `backend/src/features/payments/payments.service.ts`
- [ ] `backend/src/config/env.ts`
- [ ] `backend/src/tests/`

## Out of scope - do NOT touch
- [ ] Refunds, delivery queues, retries requiring durable job state, or frontend notification UI
- [ ] Changing the payment state machine

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] Notifications run only after the payment transaction commits.
- [ ] Email failure does not undo payment or block WhatsApp.
- [ ] WhatsApp disabled is a silent no-op.
- [ ] WhatsApp requires configured credentials when enabled.
- [ ] Logs contain no tokens, passwords, or full payment/PII values.

## Steps
1. Implement the production email adapter behind the provider-neutral port.
2. Add ticket email content and WhatsApp template payload handling.
3. Trigger both independently after fulfillment commit.
4. Add mocked failure-path tests.

## Acceptance criteria
- [ ] Email receives every ticket code in the paid order.
- [ ] WhatsApp disabled makes no provider call.
- [ ] One channel failing does not affect payment or the other channel.
- [ ] `npm run verify` passes against disposable Postgres.

## Security checklist (delete lines that don't apply)
- [ ] External input validated
- [ ] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
Payment commits first; notification delivery is isolated afterward, so a provider outage cannot change a valid financial record.
