<script setup lang="ts">
const { headingLevel = "h1" } = defineProps<{
  headingLevel?: "h1" | "h2";
}>();
</script>

<template>
  <div class="text-center mb-8">
    <div class="flex items-center justify-center gap-2 mb-2">
      <NuxtLink to="/" aria-label="Homepage">
        <span class="i-carbon-scan relative top-1 text-gh-text text-2xl" />
      </NuxtLink>

      <Component :is="headingLevel" class="text-3xl text-gh-text font-mono">
        AgentScan
      </Component>
    </div>

    <p class="text-gh-muted text-balance @md:text-wrap">
      An open experiment in detecting automation patterns on GitHub
    </p>
  </div>
</template>
