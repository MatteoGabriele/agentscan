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
    // ... (truncated) ...
  },

  integrations: {
    leaderboard: "SecureBananaLabs/bug-bounty/leaderboard.json"
  }
});