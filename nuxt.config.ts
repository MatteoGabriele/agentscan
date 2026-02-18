// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@unocss/nuxt"],

  app: {
    head: {
      htmlAttrs: { lang: "en-US" },
    },
  },
});
