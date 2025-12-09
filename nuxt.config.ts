// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  modules: ["@nuxtjs/tailwindcss", "@vueuse/nuxt", "@vite-pwa/nuxt"],

  css: ["~/assets/css/main.css"],

  // PWA Configuration
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Packing Documentation System",
      short_name: "Packing",
      description: "Aplikasi Dokumentasi Packing dengan Foto",
      theme_color: "#3b82f6",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      scope: "/",
      start_url: "/",
      icons: [
        {
          src: "/icons/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff,woff2}"],
      // Cache API responses for offline
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "google-apis",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
          },
        },
        {
          urlPattern: /\/api\/packing\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "packing-api",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60, // 1 hour
            },
            networkTimeoutSeconds: 10,
          },
        },
        {
          urlPattern: /\/api\/settings/i,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "settings-api",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
  },

  runtimeConfig: {
    jwtSecret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

    // Google Drive - Service Account (recommended)
    googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googleServiceAccountPrivateKey:
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,

    // Google Drive - OAuth2 (legacy fallback)
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,

    // Google Drive - Common
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,

    uploadTempDir: process.env.UPLOAD_TEMP_DIR || "./uploads/temp",
    public: {
      appName: "Packing Documentation",
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
  },

  app: {
    head: {
      title: "Packing Documentation System",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Aplikasi Dokumentasi Packing Fullstack",
        },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // Disabled due to vite-plugin-checker issues
  },
});
