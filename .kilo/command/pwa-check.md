---
description: Validate PWA readiness — manifest, icons, HTML meta, service worker config
---

Check the PWA surface and report a PASS/FAIL table:

1. **Manifest** — `src/pwa/manifest.js` matches `src/pwa/manifest.test.js` expectations (run `npm test`).
2. **Icons** — every icon declared in the manifest exists in `public/`, is a valid PNG, and has the declared pixel dimensions (covered by the manifest test; verify directly if it fails).
3. **HTML meta** — `index.html` carries theme-color, description, apple-touch-icon, apple-mobile-web-app-* and favicon links.
4. **Service worker config** — `vite.config.js` uses `generateSW`, precache patterns cover js/css/html/icons, navigateFallback is `/index.html`, runtime caching for images/fonts is present.
5. **Build** — `npm run build` succeeds and `dist/` contains `sw.js`, `manifest.webmanifest`, and the icon set.

Fix trivial gaps directly; report anything that needs a decision.