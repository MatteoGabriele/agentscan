<script setup lang="ts">
import type { GitHubUser, IdentifyResult } from '@unveil/identity'

const props = defineProps<{
  user: GitHubUser
  analysis: IdentifyResult
}>()

const classification = computed(() => props.analysis.classification)
const score = computed(() => props.analysis.score)

const classificationLabel = computed(() => {
  const c = classification.value
  if (!c) {
    return '—'
  }
  return c.charAt(0).toUpperCase() + c.slice(1)
})

const classificationColor = computed(() => {
  if (classification.value === 'automation') {
    return 'text-gh-danger-hover'
  }
  if (classification.value === 'mixed') {
    return 'text-amber-500'
  }
  return 'text-green-500'
})

const dotColor = computed(() => {
  if (classification.value === 'automation') {
    return 'bg-gh-danger-hover'
  }
  if (classification.value === 'mixed') {
    return 'bg-amber-500'
  }
  return 'bg-green-500'
})
</script>

<template>
  <article class="flex items-center gap-4 py-4 border-b border-gh-border-light last:border-0">
    <img
      :src="user.avatar_url"
      :alt="`${user.login} avatar`"
      class="size-9 rounded-full shrink-0"
      loading="lazy"
    />

    <div class="flex-1 min-w-0">
      <NuxtLink
        :to="`/user/${user.login}`"
        class="font-mono text-gh-text hover:underline truncate block"
      >
        {{ user.login }}
      </NuxtLink>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="size-2 rounded-full shrink-0" :class="dotColor" aria-hidden="true" />
      <span class="text-sm font-mono w-20 text-right" :class="classificationColor">
        {{ classificationLabel }}
      </span>
      <span class="text-xs text-gh-muted font-mono w-10 text-right tabular-nums">
        {{ score.toFixed(1) }}
      </span>
    </div>
  </article>
</template>
