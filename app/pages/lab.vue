<script setup lang="ts"></script>

<template>
  <section class="flex flex-col gap-6 h-full">
    <div class="h-full flex flex-col items-center justify-center w-full">
      <header class="text-center">
        <h1 class="text-2xl font-semibold">The Lab</h1>
        <p class="text-ui-muted mt-1 mb-8">Experiments in progress.</p>
        <div
          class="mt-4 p-4 bg-ui-card border-1 border-solid border-ui-border rounded-2 text-center"
        >
          <div
            aria-hidden="true"
            class="flex gap-2 items-center justify-center text-xl text-ui-text/60 mb-2"
          >
            <span class="i-lucide:flask-conical"></span>
          </div>
          <p class="text-sm text-ui-text leading-relaxed">
            This page is where we test new ideas. Things may break, data may be
            wrong, and features may disappear. Treat it as an early experiment.
          </p>
        </div>
      </header>
    </div>

    <div
      class="flex flex-col gap-20 items-center justify-center max-w-4xl mx-auto py-12 w-full"
    >
      <div class="w-full">
        <LazyChartHourlyEventsWaffle hydrate-on-visible />
      </div>
      <div class="w-full">
        <LazyChartGlobalEventsHeatmap hydrate-on-visible />
      </div>
    </div>
  </section>
</template>
