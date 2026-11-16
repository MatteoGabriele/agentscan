<script setup lang="ts">
import type { RepoReportDay } from '~~/shared/types/repo-report'

defineProps<{
  days: RepoReportDay[]
}>()

// Client only: the server can't know the viewport, so rendering this there
// would mismatch on phones.
const isMobile = useIsMobile()
</script>

<template>
  <!-- Too dense to read at phone width, so it's left out entirely. -->
  <ClientOnly>
    <section v-if="!isMobile" class="hidden md:flex flex-col gap-4">
      <header>
        <!-- No window in the heading: the chart covers every tracked day,
          not only the past 30. -->
        <h2 class="font-semibold">Daily score</h2>
        <p class="text-sm text-ui-muted text-pretty">
          Average score of each day's pull requests. The dotted line is daily
          volume.
        </p>
      </header>
      <LazyChartRepoDailyScore :days />
    </section>
  </ClientOnly>
</template>
