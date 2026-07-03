<script setup lang="ts">
definePageMeta({
  layout: 'minimal',
})

useHead({
  title: 'GitHub App | AgentScan',
  meta: [
    { property: 'og:title', content: 'GitHub App | AgentScan' },
    { property: 'og:image', content: '/app.jpg' },
    {
      property: 'og:description',
      content:
        'Install the AgentScan GitHub App for zero-config automation detection on every pull request.',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <section class="flex flex-col items-center text-center gap-6">
    <MainLogo size="lg" />

    <div>
      <h1 class="text-2xl font-semibold">AgentScan GitHub App</h1>
      <p class="text-gh-muted mt-2 max-w-md mx-auto text-pretty">
        Zero config. Works instantly. No workflow files required. Install it on
        your repositories and start scanning now.
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
  </section>
</template>
