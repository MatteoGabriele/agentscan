<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity'

const props = defineProps<{
  event: GitHubEvent
}>()

const { getTextAnalysis } = useGitHubEventDisplay()
const { trackEvent } = useSaEvent()

const analysis = computed(() => getTextAnalysis(props.event))
</script>

<template>
  <a
    v-if="analysis"
    :href="analysis.url"
    target="_blank"
    title="Open in AgentScan Text"
    class="mt-1 w-fit inline-flex items-center gap-1.5 text-xs text-ui-muted hover:text-ui-text transition-colors"
    @click="trackEvent('evidence_text_analysis_clicked')"
  >
    <span class="i-agentscan:text shrink-0" />
    {{ analysis.label }}
    <span class="i-lucide:arrow-up-right shrink-0" />
  </a>
</template>
