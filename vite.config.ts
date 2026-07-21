import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// When deployed to GitHub Pages as a project site, the app is served from
// https://<user>.github.io/<repo>/ rather than the domain root. The deploy
// workflow sets BASE_PATH to "/<repo>/"; local dev/build defaults to "/".
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        id: "/",
        name: "Workout Tracker",
        short_name: "Workouts",
        description: "Local, offline-first tracker for a sequential 32-workout program.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#111318",
        theme_color: "#111318",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        // "webp" precaches the exercise visual assets under public/exercise-visuals/
        // alongside the existing app shell files. Deliberately not widened beyond
        // that - no other binary/media extensions are added.
        globPatterns: ["**/*.{js,css,html,svg,webp}"]
      }
    })
  ]
});
