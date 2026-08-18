<script setup lang="ts">
useHead({
  htmlAttrs: {
    class: 'overflow-x-clip',
  },
})
</script>

<template>
  <section class="flex flex-col gap-6 h-full">
    <div class="h-full flex flex-col items-center justify-center w-full">
      <header class="text-center">
        <h1 class="text-2xl font-semibold">The Lab's backroom</h1>
        <p class="text-ui-muted mt-1 mb-8">Sh*t can be broken here too.</p>
      </header>
    </div>

    <div
      class="flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-4"
    >
      <div class="mb-5 transition-opacity">
        <h2 class="text-center">Hourly classification breakdown</h2>
        <p class="text-sm text-ui-muted text-center">
          The latest 24 hours, broken down per classification count.
        </p>
        <p class="text-sm text-ui-muted text-center">
          Literally an image of the CPU usage of the ecosystem.
        </p>
      </div>

      <div class="w-screen">
        <LazyChartHourlyEventsWaffle />
      </div>
    </div>
  </section>
</template>
