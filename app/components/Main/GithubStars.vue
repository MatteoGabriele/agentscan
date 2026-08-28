<script setup lang="ts">
const { trackEvent } = useSaEvent()
const { data } = await useRepoStars()

const stars = computed<string | null>(() => {
  const count = data.value?.stars

  return typeof count === 'number' ? formatCompactNumber(count) : null
})
</script>

<template>
  <NuxtLink
    external
    target="_blank"
    rel="noopener"
    to="https://github.com/MatteoGabriele/agentscan"
    class="inline-flex items-center gap-2 rounded-full border border-solid border-ui-border/80 px-2.5 py-1 text-xs text-ui-muted hover:text-ui-text hover:border-ui-border/60 transition-colors"
    title="AgentScan on GitHub"
    aria-label="AgentScan on GitHub"
    @click="trackEvent('github_repo_clicked')"
  >
    <span class="i-lucide-github"></span>

    <template v-if="stars">
      <span class="h-3 w-px bg-ui-border/70"></span>
      <span class="inline-flex items-center gap-1 tabular-nums">
        <span class="i-lucide:star text-[0.9em]"></span>
        {{ stars }}
      </span>
    </template>
  </NuxtLink>
</template>
