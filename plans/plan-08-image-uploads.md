# Plan 08 - Image Uploads

## Goal
Allow organizers to upload event banners directly to Cloudinary using a server-generated signed configuration, then store only validated Cloudinary URLs on owned events.

## Files touched
- [ ] `backend/src/features/uploads/`
- [ ] `backend/src/features/events/events.schemas.ts`
- [ ] `backend/src/features/events/events.service.ts`
- [ ] `backend/src/config/env.ts`
- [ ] `backend/src/app.ts`
- [ ] `backend/src/tests/`

## Out of scope - do NOT touch
- [ ] Server-side file proxying, local disk uploads, arbitrary remote URLs, or frontend implementation
- [ ] Image transformations or deletion workflows

## Edge cases & failure modes (fill in BEFORE coding)
- [ ] API secret never reaches the client.
- [ ] Only organizers can request signatures.
- [ ] Folder is server-controlled (`events/banners`).
- [ ] Stored URLs are HTTPS Cloudinary URLs for the configured cloud.
- [ ] An organizer cannot attach a banner to another organizer's event.

## Steps
1. Add Cloudinary configuration and signed upload service.
2. Add authenticated organizer route and standard response envelope.
3. Validate Cloudinary URL ownership on event create/update.
4. Add unit and ownership tests.

## Acceptance criteria
- [ ] Signed response contains only client-safe fields.
- [ ] Non-organizers receive 403.
- [ ] Valid Cloudinary URLs are stored on owned events.
- [ ] Arbitrary URLs and cross-owner updates are rejected.

## Security checklist (delete lines that don't apply)
- [ ] External input validated
- [ ] Parameterized queries only
- [ ] Auth checked in middleware
- [ ] Rate limited if public endpoint

## Understanding note (fill in AFTER, in your own words)
Why this works:
The backend signs only a fixed upload destination and validates the returned URL before persistence, so Cloudinary handles file bytes without exposing the signing secret or allowing arbitrary remote content.
