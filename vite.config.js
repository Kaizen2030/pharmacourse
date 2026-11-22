import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

// Two separate Supabase projects: VITE_SUPABASE_* is Pharmacourse (courses, blog, community) and
// VITE_PHARMACYOS_* is RemedacarePOS (patient portal). A build without them, or with both pointing at the same
// project, must stop here (Vercel then keeps the previous deployment live) instead of shipping a broken site.
function requireSupabaseEnv() {
  return {
    name: "require-supabase-env",
    configResolved(config) {
      if (config.command !== "build") return
      const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_PHARMACYOS_SUPABASE_URL", "VITE_PHARMACYOS_SUPABASE_ANON_KEY"].filter((key) => !String(config.env[key] || "").trim())
      if (missing.length) {
        throw new Error(`Missing ${missing.join(" and ")}. Add them to .env locally and to the Vercel project's Environment Variables (see .env.example).`)
      }
      const same = String(config.env.VITE_SUPABASE_URL).trim().replace(/\/+$/, "") === String(config.env.VITE_PHARMACYOS_SUPABASE_URL).trim().replace(/\/+$/, "")
      if (same) {
        const message = "VITE_SUPABASE_URL (Pharmacourse) and VITE_PHARMACYOS_SUPABASE_URL (RemedacarePOS) point at the same project. The course site must use its own project."
        if (process.env.VERCEL) throw new Error(message)
        console.warn(`\n[warning] ${message}\n`)
      }
    },
  }
}

export default defineConfig({
  // Never publish source maps: production users receive only the compiled bundle.
  build: {
    sourcemap: false,
    minify: "oxc",
  },
  plugins: [
    requireSupabaseEnv(),
    react(),
    tailwindcss(),
    VitePWA({
      devOptions: {
        // Keep the local preview free of service-worker state. The PWA is still generated for production.
        enabled: false,
        type: "module",
      },
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "RemedacarePOS Patient Portal",
        short_name: "RemedacarePOS",
        description: "Install the RemedacarePOS patient portal to manage prescriptions, bookings, deliveries, and patient updates from your pharmacy.",
        theme_color: "#0F6E56",
        background_color: "#f4fbf8",
        display: "standalone",
        scope: "/",
        start_url: "/patient-portal",
        orientation: "portrait",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "Create patient profile",
            short_name: "Register",
            url: "/patient/register",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Request prescription",
            short_name: "Prescription",
            url: "/patient/prescription",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Book appointment",
            short_name: "Book",
            url: "/patient/appointment",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Track updates",
            short_name: "Track",
            url: "/patient/track",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/pos(?:\/|$)/i],
        globIgnores: ["pos/**"],
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        sourcemap: false,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Same-origin static files only. Supabase (API, auth, storage, signed URLs) and other sites are never cached.
            urlPattern: ({ request, url, sameOrigin }) =>
              sameOrigin && !url.pathname.startsWith("/pos") && ["script", "style", "image", "font"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "asset-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
