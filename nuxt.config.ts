// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@unocss/nuxt", "@nuxtjs/color-mode"],

  colorMode: {
    preference: "system",
    fallback: "dark",
    dataValue: "theme",
  },

  runtimeConfig: {
    app: {
      githubToken: process.env.GITHUB_TOKEN,
    },
  },

  css: ["~/assets/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "en-US" },
    },
  },
});
