<script setup lang="ts">
definePageMeta({
  layout: false,
})

useHead({
  title: 'GitHub App | AgentScan',
  meta: [
    { property: 'og:title', content: 'GitHub App | AgentScan' },
    { property: 'og:image', content: '/app.png' },
    {
      property: 'og:description',
      content:
        'Install the AgentScan GitHub App, built for maintainers dealing with automated accounts on GitHub. Zero config.',
    },
    { property: 'og:type', content: 'website' },
  ],
})

const configGenerator = useTemplateRef('configGenerator')
function scrollToConfig() {
  configGenerator.value?.scrollIntoView({
    behavior: 'smooth',
  })
}
</script>

<template>
  <NuxtLayout name="minimal">
    <template #hero>
      <section class="flex flex-col items-center">
        <div class="flex flex-col items-center gap-6 text-center">
          <MainLogo size="lg" />

          <div>
            <h1 class="text-2xl font-semibold">AgentScan GitHub App</h1>
            <p class="mt-1 mb-6 text-gh-text/80">
              Built for maintainers dealing with automated accounts on GitHub
            </p>

            <p class="text-gh-muted mt-2 max-w-md mx-auto text-pretty">
              Zero config. Works instantly. Fully open-source. <br />Install it
              on your repositories and let it scan for you.
            </p>
          </div>

          <NuxtLink
            external
            to="https://github.com/apps/agentscanapp/installations/new"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gh-green hover:bg-gh-green-hover transition-colors"
          >
            <span class="i-lucide-github text-lg" aria-hidden="true" />
            Install the GitHub App
          </NuxtLink>

          <p class="text-xs text-gh-muted/70">
            Prefer running it in CI? Try the
            <NuxtLink
              external
              target="_blank"
              to="https://github.com/marketplace/actions/agentscan"
              class="underline hover:text-gh-text transition-colors"
            >
              GitHub Action
            </NuxtLink>
            instead.
          </p>

          <ContributorsList class="mt-4" />

          <div
            class="absolute w-full px-4 bottom-4 left-1/2 -translate-x-1/2 flex text-center justify-center"
          >
            <button
              type="button"
              class="text-sm text-gh-muted hover:text-gh-text transition-colors flex items-center justify-center gap-2.5 mt-4 flex-col"
              @click="scrollToConfig"
            >
              <span
                class="i-lucide:chevrons-down animate-scroll-hint"
                aria-hidden="true"
              />
              Customize configuration
            </button>
          </div>
        </div>
      </section>
    </template>

    <section
      ref="configGenerator"
      class="flex items-center py-12 border-t border-gh-border-light/60 w-full"
    >
      <div class="w-full max-w-2xl text-left mx-auto px-6">
        <AppConfigGenerator />
      </div>
    </section>
  </NuxtLayout>
</template>
