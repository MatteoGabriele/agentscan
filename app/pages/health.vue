<script setup lang="ts">
const { formattedNextScanTime } = useNextScanTime()

definePageMeta({
  layout: 'full',
})

useHead({
  title: 'GitHub Ecosystem Health | AgentScan',
  meta: [
    {
      name: 'description',
      content:
        'A snapshot of community contribution patterns across the ecosystem.',
    },
    { property: 'og:title', content: 'GitHub Ecosystem Health | AgentScan' },
    { property: 'og:image', content: '/health.png' },
    {
      property: 'og:description',
      content:
        'A snapshot of community contribution patterns across the ecosystem.',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <section class="flex flex-col gap-6 h-full pb-8 md:pb-0">
    <div
      class="h-full flex flex-col items-center justify-center w-full relative"
    >
      <div class="mx-auto max-w-2xl w-full">
        <header class="text-center mt-16 md:mt-24 px-4">
          <h1 class="text-2xl font-semibold">GitHub Ecosystem Health</h1>
          <div class="text-gh-muted mt-1 flex flex-col text-pretty">
            <p>
              A snapshot of community contribution patterns across the ecosystem
            </p>
            <p class="text-xs text-gh-muted/70 mt-1 text-pretty">
              Each day, we analyze 10 PRs from a curated
              <NuxtLink
                class="underline hover:text-gh-text"
                external
                target="_blank"
                to="https://github.com/MatteoGabriele/agentscan/tree/main/shared/daily-scan.ts"
              >
                list of repositories
              </NuxtLink>
            </p>
          </div>
        </header>

        <div class="mt-6 mb-12">
          <HealthTrendItemList />
        </div>
      </div>

      <div
        class="w-full min-h-0 shrink overflow-hidden basis-[300px] max-h-[300px] sm:basis-[500px] sm:max-h-[500px]"
      >
        <ChartGlobalEventsEvolution />
      </div>

      <div
        class="absolute -bottom-4 text-center md:text-left w-full md:bottom-2 pl-4"
      >
        <p class="text-xs text-gh-text/40 mt-3">
          {{ formattedNextScanTime }}
        </p>
      </div>
    </div>
  </section>
</template>
