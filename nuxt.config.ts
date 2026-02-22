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
    githubToken: process.env.NUXT_GITHUB_TOKEN || "",
    upstash: {
      redisRestUrl: process.env.NUXT_UPSTASH_REDIS_REST_URL || "",
      redisRestToken: process.env.NUXT_UPSTASH_REDIS_REST_TOKEN || "",
    },
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "",
    },
  },

  css: ["~/assets/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "en-US" },
    },
  },

  vite: {
    server: {
      allowedHosts: ["stanford-compile-fishing-being.trycloudflare.com"],
    },
  },
});
