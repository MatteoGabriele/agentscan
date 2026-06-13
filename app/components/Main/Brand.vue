<script setup lang="ts">
const { headingLevel = "h1" } = defineProps<{
  headingLevel?: "h1" | "h2";
}>();
</script>

<template>
  <div class="text-center">
    <div class="flex items-center justify-center gap-2 mb-2">
      <MainLogo />

      <Component :is="headingLevel" class="text-3xl text-gh-text font-mono">
        AgentScan
      </Component>
    </div>

    <p class="text-gh-muted text-pretty">
      An open experiment in detecting automation patterns on GitHub
    </p>
  </div>
</template>
