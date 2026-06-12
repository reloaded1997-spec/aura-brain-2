// =============================================================================
// vite.config.js (Phase 2)
// -----------------------------------------------------------------------------
// React + Tailwind v4 (via @tailwindcss/vite — no separate tailwind.config or
// PostCSS file needed). PWA (vite-plugin-pwa) is intentionally deferred to a
// later phase per the Phase 2 scope.
// =============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
