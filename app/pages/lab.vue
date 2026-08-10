<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { data: hourly } = await useEcosystemHealthHourly()
const { data: hourlyWindow } = await useEcosystemHealthHourlyWindow()
</script>

<template>
  <section class="flex flex-col gap-6 h-full">
    <div class="h-full flex flex-col items-center justify-center w-full">
      <header class="text-center">
        <h1 class="text-2xl font-semibold">The Lab</h1>
        <p class="text-gh-muted mt-1 mb-8">Sh*t can be broken here.</p>
        <div
          class="mt-4 p-4 bg-gh-card border-1 border-solid border-gh-border rounded-2 text-center"
        >
          <div
            aria-hidden="true"
            class="flex gap-2 items-center justify-center text-xl text-gh-text/60 mb-2"
          >
            <span class="i-lucide:flask-conical"></span>
            <span class="i-lucide:skull"></span>
            <span class="i-lucide:triangle-alert"></span>
          </div>
          <p class="text-sm text-gh-text leading-relaxed">
            This page is a sandbox where we test new ideas and features. Things
            here may break, data might be inaccurate, or features could
            disappear entirely. Take everything on this page with a grain of
            salt and treat it as early-stage exploration, not production-ready
            tools.
          </p>
        </div>
      </header>
    </div>

    <div
      class="flex flex-col gap-20 items-center justify-center max-w-4xl mx-auto pb-12 w-full px-4"
    >
      <div v-if="hourly" class="w-full">
        <LazyChartHourlyEventsEvolution
          :scan-times="hourly.scanTimes"
          :counts-by-scan-time="hourly.countsByScanTime"
          :automation-threshold="25"
          :mixed-threshold="25"
          hydrate-on-visible
        />
      </div>
      <div v-if="hourlyWindow" class="w-full">
        <LazyChartHourlyEventsEvolution
          :scan-times="hourlyWindow.scanTimes"
          :counts-by-scan-time="hourlyWindow.countsByScanTime"
          :automation-threshold="50"
          :mixed-threshold="50"
          hydrate-on-visible
        />
      </div>
      <div class="w-full">
        <LazyChartHealthResponseSparklines />
      </div>
      <div class="w-full">
        <LazyChartScoreDistribution
          :data="hourly?.results"
          hydrate-on-visible
        />
      </div>
      <div class="w-full">
        <LazyReportWeeklyClassification
          :hydrate-on-visible="{ rootMargin: '0px 0px 600px 0px' }"
        />
      </div>
      <div class="w-full">
        <LazyChartFeaturedPackageHealthRanking hydrate-on-visible />
      </div>
      <div class="w-full">
        <LazyLabBountyRepoList hydrate-on-visible />
      </div>
    </div>
  </section>
</template>
