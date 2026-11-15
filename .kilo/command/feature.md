---
description: Spec-first feature workflow — find SRS IDs, write failing tests, implement, verify
---

Implement a feature the spec-first way.

1. **Spec lookup** — read `Project_Plan/` (SRS + `Design.html`). Find the FR/BR/SR/NFR IDs for `$ARGUMENTS`. If the request is not traceable to the SRS, stop and ask before building.
2. **Plan** — list affected files/screens from the approved design; note any API contract impact (`docs/API_CONTRACT.md`).
3. **Tests first** — add the failing tests that encode the acceptance criteria (see `docs/TESTING.md`). Run `npm test` and confirm they fail for the right reason.
4. **Implement** — backend rules first (server-authoritative), then `src/lib/` adapters, then UI. Use semantic design tokens only, no hex literals.
5. **Verify** — run `npm run lint`, `npm test`, `npm run build`. All must pass.
6. Report: SRS IDs covered, files changed, test evidence.

Rules: never silently overwrite records (append-only corrections), never let the
frontend be the sole authority for permissions/stock math, never prescribe or
advise dose changes.