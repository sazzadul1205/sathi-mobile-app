---
description: Run the full quality gate — lint, tests, build, dependency audit
---

Run every verification gate and report results. Do not modify code unless a gate
fails and the fix is trivial and obvious.

1. `npm run lint` — ESLint must be clean.
2. `npm test` — the full Vitest suite must pass.
3. `npm run build` — production build incl. service worker + manifest.
4. `npm audit` — must report 0 vulnerabilities.

If a gate fails: report the failure, fix it if trivial, then re-run all gates.
Finish with a compact PASS/FAIL table per gate.