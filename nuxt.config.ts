// https://nuxt.com/docs/api/configuration/nuxt-config

// const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? "";
// const tunnelHostname = siteUrl
//   ? siteUrl.replace("https://", "").replace("http://", "")
//   : "";

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
    githubToken: "",
    // upstash: {
    //   redisRestUrl: "",
    //   redisRestToken: "",
    // },
    // public: {
    //   siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "",
    // },
  },

  css: ["~/assets/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "en-US" },
    },
  },

  // vite: {
  //   server: {
  //     // Allow tunnel when working locally at atproto stuff
  //     allowedHosts: tunnelHostname ? [tunnelHostname] : [],
  //   },
  // },
});
