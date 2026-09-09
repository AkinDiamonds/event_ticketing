# Review checklist

Run this on every diff before merge — by a human, or by a different model than the one that wrote the code.

- [ ] Diff touches exactly the files listed in the plan — nothing more
- [ ] Every edge case in the plan is handled — point to the line, don't take it on faith
- [ ] No new dependency without a one-line justification
- [ ] Security baseline from `CONVENTIONS.md` respected — quote the actual validating/parameterizing line
- [ ] Tests added and passing, including the failure-path tests
- [ ] If this changed architecture: `ARCHITECTURE.md` and `DECISIONS.md` updated in the same PR
- [ ] The reviewer re-derived the requirement from the plan independently — not just "reads fine to me"
- [ ] You (human) can explain in one sentence why this works. If you can't, do not merge.
