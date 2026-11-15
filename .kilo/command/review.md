---
description: Multi-perspective review of uncommitted changes — correctness, security, architecture, spec conformance
---

Review the current uncommitted changes (`git diff` + `git status`). Run these
passes in order and report findings per pass, each with severity
(blocker / should-fix / nit):

1. **Spec conformance** — does every change trace to the SRS (FR/BR/SR/NFR)? Flag scope creep or unspecced behavior.
2. **Correctness** — logic, edge cases, error paths. Offline/sync changes must prove: no duplicates on retry, conflicts flagged not applied, event time preserved.
3. **Security** — no secrets/tokens in code or logs; server-side permission checks assumed; no patient details in previews/URLs; no prescribing language.
4. **Architecture** — layer rules (`app → features → lib`), adapters not bypassed, server-authoritative boundaries respected.
5. **Design system** — semantic tokens only (no hex in components), matches `Design.html`.
6. **Tests** — behavior changes have tests; tests fail before the fix and pass after.

Do not fix anything during the review; report only. If findings exist, list them
file:line-first so the main agent can dispatch fixes.