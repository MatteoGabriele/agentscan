<script setup lang="ts">
const props = defineProps<{
  repo: string
  /** First day with scored pull requests, for tracked repos. */
  trackedSince?: string
}>()

// Built here rather than in the template: Volar rewrites `//` in component
// props as a comment, which breaks type checking for the rest of the template.
const repoUrl = computed<string>(() => `https://github.com/${props.repo}`)

const trackedSinceLabel = computed<string | undefined>(() => {
  if (!props.trackedSince) {
    return undefined
  }

  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(new Date(props.trackedSince))
})
</script>

<template>
  <header
    class="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
  >
    <div class="flex flex-col gap-1 min-w-0">
      <h1 class="text-xl font-semibold font-mono break-all">{{ repo }}</h1>
      <p v-if="trackedSinceLabel" class="text-xs text-ui-muted">
        Monitored daily since {{ trackedSinceLabel }}
      </p>
    </div>

    <NuxtLink
      :to="repoUrl"
      external
      target="_blank"
      class="self-start sm:self-auto shrink-0 inline-flex items-center gap-1 text-sm text-ui-muted underline hover:text-ui-text"
    >
      Open on GitHub
      <span class="i-lucide:arrow-up-right text-xs" aria-hidden="true" />
      <span class="sr-only">(opens in a new tab)</span>
    </NuxtLink>
  </header>
</template>
