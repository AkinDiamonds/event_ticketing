# Event Ticketing — Backend

The backend for Event Ticketing, a platform for LASU students to discover and buy tickets to campus parties, and for organizers to create events and check attendees in at the door using anonymous, single-use codes. This repo is the API and all business logic — the frontend lives in a separate repo.

## Quick start
```bash
# install
cd backend
cp .env.example .env.local    # fill in local values — see ../backend-technical-documentation.md, Section 4
npm install
docker compose -f ../docker-compose.yml up -d postgres
npm run db:migrate

# run
npm run dev              # http://localhost:3000 — Swagger UI at /api/docs

# verify (starts and removes disposable test Postgres automatically)
npm run verify
```

## Documentation map

| File | Answers | Update when |
|---|---|---|
| `backend-technical-documentation.md` | "How does the backend actually work, end to end, right now?" — stack, data model, business rules, auth, payments, deployment | Whenever real, current behavior changes |
| `backend/CONVENTIONS.md` | "How do we write code here?" | A style/pattern actually changes |
| `backend/ARCHITECTURE.md` | "How is the system built, and why?" | A plan changes structure or a major decision |
| `backend/DECISIONS.md` | "Why did we choose X over Y?" | Any significant, hard-to-reverse decision |
| `backend/CONTRIBUTING.md` | "How do I pick up work and ship it?" | Process changes |
| `plans/plan_TEMPLATE.md` | "What shape must every plan follow?" | The plan contract changes |
| `PROGRESS.md` | "Who's working on what, and is it done?" | Every plan you start or finish |
| `REVIEW_CHECKLIST.md` | "Is this diff safe to merge?" | Every merge |

`backend-technical-documentation.md` and `backend/ARCHITECTURE.md`/`backend/DECISIONS.md` can look like they overlap — they don't. The tech doc is a **current-state snapshot**; architecture and decisions record structural direction and reasoning. If something changes, update the tech doc to match reality, and log *why* it changed in `backend/DECISIONS.md` if it was a real judgment call.

## The workflow

1. **Pick up a plan.** Take the next plan file from `plans/`.
2. **Read it and break it before you build it.** List edge cases and security issues *before* writing any code. Add them directly into the plan file, under its Deliverables / Edge Cases section — the plan should document its own blind spots before implementation starts, not after something breaks in production.
3. **Implement strictly to the plan.** Build exactly what's written. If the plan turns out to be wrong or incomplete mid-build, stop and fix the plan first — don't quietly build something else and let the plan go stale.
4. **Run the required tests, fix failures.** `npm test` has to be green before this moves forward.
5. **Update `ARCHITECTURE.md` / `DECISIONS.md` — only if something structural actually changed.** Routine changes don't belong here; padding these files with every small diff makes them useless for the one time someone actually needs to know *why*.
6. **Log it in `PROGRESS.md`.** Your name, which plan, and status (`Done` / `Reviewing`).
7. **Check the diff against `REVIEW_CHECKLIST.md`** before anyone else looks at it.
8. **Commit, push, open a PR.**
9. **Get reviewed, then merge:**
   - Reviewed by a teammate → they merge once approved.
   - Reviewed by Copilot (or another AI reviewer) → read the review, fix anything it flags, and merge it yourself once it's clean.

This works the same at any team size. A solo contributor or a two-person team can lean on an AI reviewer as "the reviewer that didn't write the code" — that's exactly the situation this workflow is built for, not a fallback for when a bigger team isn't available.
