/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Deployed to GitHub Pages at https://<user>.github.io/splitter/
// Change `base` if the repo name or hosting path differs.
export default defineConfig({
  base: "/splitter/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-16.png", "favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        id: "/splitter/",
        name: "Splitter — Reparte gastos entre amigos",
        short_name: "Splitter",
        description:
          "Gestiona tus gastos personales y comparte gastos de grupo sin complicaciones.",
        start_url: "/splitter/",
        scope: "/splitter/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0B0F17",
        theme_color: "#6366F1",
        lang: "es",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell + static assets: cache-first via precache manifest.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // Never cache Firebase/Firestore/Auth traffic — always hit the network,
            // the Firestore SDK already handles its own offline persistence/queueing.
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { "@": "/src" },
  },
  build: {
    // The Firebase SDK (auth + firestore + functions) accounts for most of
    // this — acceptable for a PWA that's cached after first load; splitting
    // it further is a reasonable follow-up but not correctness-critical.
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
