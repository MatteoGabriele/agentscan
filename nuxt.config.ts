import { resolve } from 'path'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@unocss/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
  ],

  vite: {
    optimizeDeps: {
      include: [
        'dayjs',
        '@unveil/identity',
        '@vueuse/core',
        'vue-data-ui/vue-ui-xy',
        'vue-data-ui/vue-ui-heatmap',
        'vue-data-ui/vue-ui-icon',
        'vue-data-ui/vue-ui-horizontal-bar',
        'vue-data-ui/vue-ui-waffle',
      ],
    },
  },

  fonts: {
    families: [
      {
        name: 'Roboto',
        weights: ['400', '500', '600'],
        preload: true,
        global: true,
      },
      {
        name: 'Open Sans',
        weights: ['400', '500'],
        preload: true,
        global: true,
      },
    ],
  },

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    dataValue: 'theme',
  },

  nitro: {
    serverAssets: [{ baseName: 'data', dir: resolve('data') }],
  },

  runtimeConfig: {
    // agentscan-logs base URL (NUXT_LOGS_API_BASE), proxied by the activity and
    // automation-tally routes.
    logsApiBase: 'https://logs.agentscan.tools',
    githubToken: '',
    githubAppId: '',
    githubAppPrivateKey: '',
    githubWebhookSecret: '',
    discordPublicKey: '',
  },

  css: ['~/assets/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'en-US' },
    },
  },

  router: { options: { scrollBehaviorType: 'smooth' } },

  routeRules: {
    '/health': {
      redirect: {
        to: '/activity',
        statusCode: 301,
      },
    },

    // Redirects from the paths used before the agentscan-logs rename.
    '/api/health': {
      redirect: {
        to: '/api/activity',
        statusCode: 301,
      },
    },

    '/api/health/**': {
      redirect: {
        to: '/api/activity/**',
        statusCode: 301,
      },
    },

    '/privacy-policy': { prerender: true },

    '/api/account/**': {
      cache: {
        maxAge: 60 * 5,
      },
    },

    '/api/contributors/**': {
      cache: {
        maxAge: 60 * 60 * 24,
      },
    },

    // Served from data/adopters.json, updated with `pnpm collect:adopters`.
    '/api/adopters': {
      cache: {
        maxAge: 60 * 60,
      },
    },

    '/api/identify-replicant/**': {
      isr: {
        expiration: 60 * 60,
        passQuery: true,
      },
      cache: { maxAge: 60 * 60 },
    },
    '/api/verified-automations/**': {
      cache: {
        maxAge: 60 * 60,
      },
    },
    '/api/detected-automations/**': {
      cache: {
        maxAge: 60 * 60,
      },
    },
    '/api/integration/**': {
      cache: {
        maxAge: 60 * 5,
      },
    },
    '/api/scan/**': {
      isr: {
        expiration: 60 * 60,
        passQuery: true,
      },
      cache: { maxAge: 60 * 60 },
    },
    '/feed.xml': {
      cache: {
        maxAge: 60 * 60,
      },
    },
    '/schemas/**': {
      headers: {
        'cache-control':
          'public, max-age=86400, stale-while-revalidate=2592000',
      },
    },
  },
})
