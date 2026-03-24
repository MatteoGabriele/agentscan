export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@unocss/nuxt", "@nuxtjs/color-mode", "@nuxt/fonts"],

  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "dayjs", // CJS
        "voight-kampff-test",
        "@vueuse/core",
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

    "/privacy-policy": { prerender: true },

    "/api/account/**": {
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
  },
});
