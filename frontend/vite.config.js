import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "pwa-icon-192.svg",
        "pwa-icon-512.svg",
      ],
      manifest: {
        name: "NoteFlow",
        short_name: "NoteFlow",
        description: "Capture, organize, and share notes — even offline.",
        theme_color: "#14b8a6",
        background_color: "#121212",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // Skip API calls and phpMyAdmin — those should go to the server.
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//, /^\/storage\//, /^\/broadcasting\//, /^\/phpmyadmin\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/storage/"),
            handler: "CacheFirst",
            options: {
              cacheName: "noteflow-uploads",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sanctum": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/storage": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/broadcasting": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // terser produces smaller output than the default esbuild (~5-10%),
    // at the cost of slightly slower production builds.
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — rarely changes between deploys
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Rich-text editor — large and stable
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-underline",
            "@tiptap/extension-image",
            "@tiptap/extension-placeholder",
          ],
          // WebSocket / realtime — only needed on shared notes, loaded lazily
          "vendor-realtime": ["laravel-echo", "pusher-js"],
          // Offline storage — only needed when PWA sync kicks in
          "vendor-offline": ["localforage"],
          // Utility libraries
          "vendor-utils": ["axios", "zustand", "react-hot-toast", "lucide-react"],
        },
      },
    },
  },
});
