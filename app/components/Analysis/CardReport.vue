<script setup lang="ts">
const props = defineProps<{
  report: AutomationReport
}>()

const approvedBy = computed<string[]>(() => {
  return props.report.approvedBy ?? []
})
</script>

<template>
  <section>
    <header class="mb-2 flex gap-2 items-center text-ui-automation">
      <span class="i-lucide:circle-alert text-base" aria-hidden="true" />
      <h3 class="text-xl font-mono">Community reported</h3>
    </header>

    <p class="mt-1 text-ui-text">
      {{ report.reason }}
    </p>

    <footer
      class="mt-4 pt-4 border-t border-ui-border-subtle/40 flex flex-wrap items-start justify-between gap-x-4 gap-y-2"
    >
      <div class="flex flex-col gap-2">
        <ReportMeta :report="report" />
        <ReportApprovals v-if="approvedBy.length" :approved-by="approvedBy" />
      </div>

      <NuxtLink
        :to="report.issueUrl"
        target="_blank"
        external
        class="text-ui-muted underline inline text-xs hover:text-ui-text"
      >
        View issue
      </NuxtLink>
    </footer>
  </section>
</template>
