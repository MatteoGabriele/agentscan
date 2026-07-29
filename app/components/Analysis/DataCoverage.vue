<script setup lang="ts">
const props = defineProps<{
  level: DataCoverageLevel
}>()

const labels: Record<DataCoverageLevel, string> = {
  full: 'Full data coverage',
  partial: 'Partial data coverage',
  low: 'Low data coverage',
}

const label = computed<string>(() => labels[props.level])
const icon = computed<string>(() => {
  if (props.level === 'full') {
    return 'i-lucide:wifi'
  } else if (props.level === 'partial') {
    return 'i-lucide:wifi-high'
  } else {
    return 'i-lucide:wifi-low'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full border border-gh-border/40 bg-white/2 text-xs text-gh-muted"
    title="How much activity was available to analyze, based on the number of public events and the days they span. It does not measure how certain the classification is."
  >
    <span :class="icon" class="text-xs shrink-0" aria-hidden="true" />
    {{ label }}
  </span>
</template>
