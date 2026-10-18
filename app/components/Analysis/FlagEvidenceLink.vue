<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity'

const props = defineProps<{
  event: GitHubEvent
}>()

const { getEventDescription, getEventUrl } = useGitHubEventDisplay()

const description = computed(() => getEventDescription(props.event))
const url = computed(() => getEventUrl(props.event))
</script>

<template>
  <a
    v-if="url"
    :href="url"
    target="_blank"
    class="text-sm text-ui-text hover:underline inline-flex items-center gap-1"
  >
    {{ description }}
    <span
      class="i-lucide:external-link text-ui-muted opacity-60 shrink-0"
      style="font-size: 0.6rem"
    />
  </a>
  <span v-else class="text-sm text-ui-text">{{ description }}</span>
</template>
