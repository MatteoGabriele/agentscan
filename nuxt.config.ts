export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["@unocss/nuxt", "@nuxtjs/color-mode", "@nuxt/fonts"],
  plugins: ["~/plugins/simpleanalytics.client"],

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
        "vue-data-ui/vue-ui-horizontal-bar",
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
    "/api/detected-automations/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },
    "/api/health/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },
    "/api/integration/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },
    "/api/scan/**": {
      cache: {
        maxAge: 60 * 5,
      },
    },
    "/feed.xml": {
      cache: {
        maxAge: 60 * 60,
      },
    },
  },
});
