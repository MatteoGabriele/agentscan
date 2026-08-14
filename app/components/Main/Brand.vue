<script setup lang="ts">
const { headingLevel = 'h1' } = defineProps<{
  headingLevel?: 'h1' | 'h2'
}>()
</script>

<template>
  <div class="text-center">
    <div class="flex items-center justify-center gap-2 mb-2">
      <MainLogo />

      <Component :is="headingLevel" class="text-3xl text-ui-text font-mono">
        AgentScan
      </Component>
    </div>

    <p class="text-ui-muted text-pretty">
      Automation pattern detection for open source maintainers
    </p>
  </div>
</template>
