export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@unocss/nuxt", "@nuxtjs/color-mode", "@nuxt/fonts"],

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
});
