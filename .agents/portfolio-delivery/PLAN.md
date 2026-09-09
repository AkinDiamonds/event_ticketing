# Portfolio completion plan

Owner: any agent. Update this file and `RESULTS.md` after each completed item.

## Rules of engagement

- Preserve user changes already present in the worktree.
- Do not invent portfolio facts. Use verified existing content or `TODO:` placeholders.
- Use only design tokens from `src/app/globals.css`; add tokens before using new values.
- Do not create or run Playwright tests for this delivery phase; the user will handle browser testing. Record non-browser verification only when explicitly requested.
- Stop only for a material decision that cannot be safely inferred (such as Firebase project configuration or real contact/content facts).

## Small execution steps

- [x] 01. Record baseline Git state, dependencies, routes, and test status.
- [x] 02. Read the installed Next.js App Router documentation relevant to pages, dynamic routes, metadata, and client boundaries.
- [x] 03. Audit tokens, arbitrary values, accessibility, responsive behavior, and component sizes.
- [x] 04. Run verification batch A and record the baseline failures.
- [x] 05. Audit the Rive integration: asset loading, state-machine inputs, resize handling, reduced-motion, and cleanup.
- [x] 06. Simplify the agent modal shell: no title, avatars, simulated assistant thread, or decorative AI-send icon.
- [x] 07. Implement the three approved prompt cards so selection populates the input only.
- [x] 08. Run verification batch B and record results.
- [x] 09. Make the cat visually stand above the modal, draggable, keyboard-accessible, and bounds-safe.
- [x] 10. Wire dialog accessibility: focus management, Escape, backdrop behavior, labels, and mobile layout.
- [x] 11. Remove prohibited autoplay/loop-like agent behavior and any unapproved dialogue copy/effects.
- [x] 12. Run verification batch C and record results.
- [x] 13. Redesign the blog index as minimalist ink-on-paper with no card borders.
- [x] 14. Add the approved Structured Outputs vs JSON article with accurate, self-contained technical content.
- [x] 15. Refine the post page typography, metadata, navigation, and readable article treatment.
- [ ] 16. Run verification batch D and record results.
- [ ] 17. Audit and repair all home-section links, semantics, focus states, and route destinations.
- [ ] 18. Refactor oversized components and eliminate arbitrary Tailwind values by extending token definitions.
- [ ] 19. Add/repair focused Playwright coverage for agent modal, blog, a11y, and responsive regression cases.
- [ ] 20. Run verification batch E and record results.
- [ ] 21. Add a Firebase-ready client boundary/configuration contract without credentials or fabricated backend behavior.
- [ ] 22. Re-check production behavior: errors, accessibility, no horizontal scroll, motion preferences, and routing.
- [ ] 23. Run final verification batch F and record results.
- [ ] 24. Summarize remaining user-owned setup (Firebase/API credentials/content), and prepare one commit recommendation per completed section.
- [ ] 25. Replace the raw JSON admin view with a project editor covering every public project field and media URL/upload.
- [ ] 26. Move admin reads/writes/uploads behind Basic-Auth-protected server routes using Firebase Admin SDK.
- [ ] 27. Add deploy-safe Firebase Admin environment documentation and restrictive Firestore/Storage rules.
- [ ] 28. Make homepage metadata, JSON-LD, robots, sitemap, and llms.txt establish Simeon Akinrinola as a software and AI engineer.
- [ ] 29. Add a non-navigated factual machine-readable profile route; do not claim that a public URL is literally LLM-only.
- [ ] 30. Repair cat drag initialization, route re-entry, and drag-release activation behavior.

## Known constraints / decisions

- Rive state-machine values are user-confirmed; inspect and preserve them rather than guessing replacements.
- The user supplied the public Firebase configuration. Secure server-side Firebase administration still requires a Firebase service-account credential in Vercel.
- The modal input can collect drafts locally until the user connects their Python agent API.
