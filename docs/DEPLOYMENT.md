# Vercel & Firebase Notifications Setup

Infrastructure in this repo for deploying the Sathi PWA to Vercel and enabling web push notifications via Firebase Cloud Messaging (FCM).

## Vercel

- **Config:** `vercel.json`
  - Build: `npm run build`, output `dist/` (Vite SPA).
  - SPA rewrite: all routes -> `/index.html` (hash routing still works; rewrite ensures deep links resolve).
  - Security/cache headers: nosniff, referrer policy, frame deny, permissions policy; immutable caching for `/assets/*`; revalidation for service worker/manifest files.
- **Deploy:** connect the repo/project in Vercel (or `vercel` CLI). Set environment variables from `.env.example` in Vercel Project Settings for push support.
- **Node:** project requires Node `^20.19.0 || >=22.12.0`; Vercel uses configured/build environment (Node 22 recommended).

## Firebase Cloud Messaging (Web Push)

### 1. Create/configure Firebase
1. Create/select a Firebase project and add a **Web app**.
2. Enable **Cloud Messaging**.
3. In Cloud Messaging > Web configuration, generate a **Web Push certificate (VAPID key pair)**.
4. Copy config values into environment variables (`.env` locally, Vercel env vars in hosted env):

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=   # optional
VITE_FIREBASE_VAPID_KEY=
```

See `.env.example`. Do not commit real secrets.

### 2. Client infrastructure (this repo)
- `src/lib/notifications/firebase.js`: Firebase app/messaging initialization (guarded by config/support checks), token retrieval, foreground message subscription.
- `src/lib/notifications/push.js`: permission/capability helpers, local prefs storage (`sathi-notification-prefs`), FCM token storage (`sathi-fcm-token`), messaging SW registration (`/firebase-messaging-sw.js`), local/foreground notification helpers.
- `src/screens/NotificationPreferences.jsx`: UI to view capability/permission/config state, request permission, register FCM token, and manage local category preferences.
- `public/firebase-messaging-sw.js`: background messaging service worker scaffold (Firebase compat SDK). **You must provide runtime config** for production background handling (replace placeholders or generate this file during deploy/build with real Firebase web config). Without valid config it no-ops safely.
- `index.html`: CSP updated to allow required Firebase/Google endpoints and gstatic scripts for messaging.
- `vercel.json`: SPA hosting headers/rewrites compatible with PWA assets.

### 3. Service worker note
The app uses `vite-plugin-pwa` with `generateSW` for the PWA shell. FCM background handling uses `public/firebase-messaging-sw.js`. Depending on scope/registration strategy, service workers can overlap; for production you may want to consolidate via Workbox `injectManifest` (custom SW that includes precaching + Firebase messaging) or register the messaging SW on a dedicated push scope. Current infrastructure supports token registration and foreground/local notification flows; validate background delivery in your target browsers.

### 4. Sending notifications
- Client obtains/stores an FCM registration token when the user grants permission and Firebase/VAPID are configured.
- To deliver push messages, a trusted backend must send via FCM using the token (never expose server credentials in the client). Backend integration is out of scope of this frontend repo.
- Respect privacy rules: do not include sensitive patient/medicine details in push previews when hidden-preview preference/policy applies (SR-12).

### 5. Verification
- `npm run lint && npm test`
- `npm run build` (confirm `dist/`, SW/manifest, and `firebase-messaging-sw.js` copied from `public/`)
- Manual: deploy/preview over HTTPS, grant notification permission, confirm token/foreground behavior, and test background delivery with configured SW.
