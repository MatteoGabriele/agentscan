export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@unocss/nuxt",
    "@nuxtjs/color-mode",
    "@nuxt/fonts",
    "nuxt-auth-utils",
    "@sidebase/nuxt-auth",
  ],

  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "dayjs", // CJS
        "@unveil/identity",
        "@vueuse/core",
        "vue-data-ui/vue-ui-xy",
        "vue-data-ui/vue-ui-heatmap",
        "vue-data-ui/vue-ui-icon",
      ],
    },
  },

  fonts: {
    families: [
      {
        name: "Roboto",
        weights: ["400", "500", "600"],
        preload: true,
        global: true,
      },
      {
        name: "Open Sans",
        weights: ["400", "500"],
        preload: true,
        global: true,
      },
    ],
  },

  colorMode: {
    preference: "system",
    fallback: "dark",
    dataValue: "theme",
  },

  auth: {
    baseURL: process.env.AUTH_ORIGIN || "http://localhost:3000/api/auth",
    provider: {
      type: "authjs",
    },
  },

  runtimeConfig: {
    githubToken: "",
  },

  css: ["~/assets/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "en-US" },
    },
  },

  routeRules: {
    "/": {
      isr: {
        expiration: 60 * 60,
        passQuery: true,
        allowQuery: ["user"],
      },
      cache: { maxAge: 3600 },
    },

    "/privacy-policy": { cache: { maxAge: 3600 } },

    "/api/account/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },

    "/api/scanner/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },

    "/api/identify-replicant/**": {
      isr: {
        expiration: 60 * 10,
        passQuery: true,
      },
      cache: { maxAge: 600 },
    },
    "/api/verified-automations/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },
    "/api/scan/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },
    "/api/repo/**": {
      cache: {
        maxAge: 60 * 10,
        headersOnly: true,
      },
    },
    "/feed.xml": {
      cache: {
        maxAge: 60 * 60,
      },
    },
  },
});
