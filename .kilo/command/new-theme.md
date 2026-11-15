---
description: Add a new color theme variant end-to-end (tokens, mapping, controller, test)
---

Add a new color variant named `$ARGUMENTS`.

1. Copy `src/styles/themes/default.css` to `src/styles/themes/<name>.css`, rename the selector to `[data-theme='<name>']`, and adjust the token values. Every `--t-*` token in the contract must be defined.
2. Register the import in `src/index.css` (after the other theme imports).
3. Add `'<name>'` to `availableThemes` in `src/theme.js`.
4. Run `npm test` — `src/styles/themes.test.js` must pass (it fails if any token is missing).
5. Run `npm run build` — verify all theme selectors appear in the built CSS.

Report the file list and test/build evidence. Do not change the default theme
without being asked.