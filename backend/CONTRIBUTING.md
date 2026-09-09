# Contributing

The same system works whether you're a human teammate or an AI agent — the plan file is the contract in both cases.

## Picking up work
1. Take the next numbered plan in `plans/`, or write a new one from `plans/plan_TEMPLATE.md`.
2. Read `CONVENTIONS.md` and the relevant part of `ARCHITECTURE.md` before writing anything.
3. Fill in the plan's **Deliverables / Edge Cases** section before writing any code — list edge cases and security issues up front. This is the step it's easiest to skip, and it's where bugs get caught cheapest.
4. Implement, touching only the files listed in the plan's Scope section.
5. Run the required tests and fix any failures.
6. If anything structural changed, update `ARCHITECTURE.md` and add an entry to `DECISIONS.md` in the same PR.
7. Log it in `PROGRESS.md` — your name, the plan, and status (`Done` / `Reviewing`).
8. Self-check against `REVIEW_CHECKLIST.md`.
9. Commit, push, and open the PR. Branch naming, commit format, what the PR description must contain, and the merge process all live in `CONVENTIONS.md`'s Git Workflow section — nothing here repeats them, that file is the source of truth.

## What a plan file needs to contain
`plans/plan_TEMPLATE.md` is the canonical shape once it exists — keep the two in sync if either changes. At minimum, every plan needs:
- **Goal** - what this plan delivers, in a sentence or two.
- **Files touched** - the specific files this plan is allowed to touch.
- **Out of scope** - explicit do-not-touch boundaries.
- **Edge cases & failure modes** - filled in *before* implementation starts.
- **Steps** - the actual build order.
- **Acceptance criteria** - what "finished" means, concrete enough to verify.
- **Security checklist** - applicable controls from the repository conventions.
- **Understanding note** - completed after implementation in the contributor's own words.

## If you're using an AI agent
- Paste in: the relevant `CONVENTIONS.md` section, the plan step, and the do-not-touch list. Don't paste the whole repo — scoped context produces scoped output.
- Never apply a diff you haven't read line by line.
- Review works the same as it does for a human contributor — any teammate or Copilot can review any change, including one an AI wrote. No special-cased reviewer rules.
