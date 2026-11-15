// src/pwa/manifest.js
// Single source of truth for the PWA manifest, shared by vite.config.js
// and the unit tests (see src/pwa/manifest.test.js).
export const manifest = {
  name: 'Sathi — Care Coordination',
  short_name: 'Sathi',
  description:
    'Coordinate medication, inventory, purchases and transport for a shared care plan.',
  theme_color: '#1f6f8b',
  background_color: '#eef3f6',
  display: 'standalone',
  start_url: '/',
  scope: '/',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}