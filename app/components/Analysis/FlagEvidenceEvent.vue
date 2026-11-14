<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity/providers/github'

defineProps<{
  event: GitHubEvent
}>()

const { formatEventTime } = useGitHubEventDisplay()
</script>

<template>
  <div class="min-w-0 flex flex-col gap-0.5">
    <AnalysisFlagEvidenceLink :event />
    <p class="text-xs text-ui-muted">
      {{ formatEventTime(event.created_at) }}
      <template v-if="event.repo?.name"> · {{ event.repo.name }}</template>
    </p>
    <AnalysisFlagEvidenceTextLink :event />
  </div>
</template>
