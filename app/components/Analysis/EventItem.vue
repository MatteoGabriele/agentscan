<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity/providers/github'

withDefaults(
  defineProps<{
    event: GitHubEvent
    showRepo?: boolean
  }>(),
  { showRepo: true },
)

const { getEventIcon, formatEventTime } = useGitHubEventDisplay()
</script>

<template>
  <li class="flex gap-2.5 px-3 py-2">
    <span
      :class="getEventIcon(event)"
      class="text-xs text-ui-muted shrink-0 mt-1"
    />
    <div class="min-w-0 flex-1">
      <AnalysisFlagEvidenceLink :event />
      <p class="text-xs text-ui-muted">
        {{ formatEventTime(event.created_at) }}
        <template v-if="showRepo && event.repo?.name">
          · {{ event.repo.name }}
        </template>
      </p>
      <AnalysisFlagEvidenceTextLink :event />
    </div>
  </li>
</template>
