// =============================================================================
// vite.config.js
// -----------------------------------------------------------------------------
// React + Tailwind v4 (via @tailwindcss/vite — no separate tailwind.config or
// PostCSS file needed) + PWA (vite-plugin-pwa, ARCHITECTURE.md §2): standalone
// display for iOS native feel, auto-updating service worker, app shell + Google
// Fonts cached for offline. Firestore traffic is never intercepted — its own
// persistentLocalCache handles offline data.
// =============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Aura',
        short_name: 'Aura',
        description: 'A quiet place to carry your people, prayers, and rhythms.',
        start_url: '/',
        display: 'standalone',
        theme_color: '#FAF8F3',
        background_color: '#FAF8F3',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
