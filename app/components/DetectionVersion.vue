<script setup lang="ts">
const engine = useDetectionEngine()

const fullText = computed<string>(() => `${engine.name} ${engine.label}`)

const tooltipLabel = computed<string>(() => {
  const base =
    'The detection library version behind this result. Another tool running a different version can rate the same account differently.'

  if (engine.isPrerelease) {
    return `${base} This is a pre-release build.`
  }

  return base
})
</script>

<template>
  <Tooltip :label="tooltipLabel" wide>
    <NuxtLink
      external
      target="_blank"
      :to="engine.npmUrl"
      :aria-label="fullText"
      class="detection-chip inline-flex items-center gap-1 whitespace-nowrap rounded-full border-1 border-solid border-ui-border/50 px-2 py-0.5 text-xs text-ui-muted/80 transition-colors hover:border-ui-border hover:text-ui-text"
    >
      <span
        class="i-lucide:fingerprint text-[0.9em] shrink-0"
        aria-hidden="true"
      />

      {{ fullText }}
    </NuxtLink>
  </Tooltip>
</template>
