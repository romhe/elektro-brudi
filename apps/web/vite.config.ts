import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ElektroBrudi Phase 0",
        short_name: "ElektroBrudi",
        lang: "de",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0b3d91",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        // Only the built shell is precached. API responses, snapshots, and
        // model artifacts never enter a service-worker cache.
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallbackDenylist: [/^\/api\//u],
        runtimeCaching: [],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
      },
    }),
  ],
  build: { target: "es2022", sourcemap: false },
  worker: { format: "es" },
  server: { proxy: { "/api": "http://127.0.0.1:47831" } },
});
