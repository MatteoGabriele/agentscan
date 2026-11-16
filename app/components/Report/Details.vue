<script setup lang="ts">
defineProps<{
  report: VerifiedAutomation
}>()
</script>

<template>
  <div>
    <blockquote
      class="m-0 text-ui-text whitespace-pre-line break-words text-pretty"
    >
      {{ report.reason }}
    </blockquote>

    <ReportApprovals
      v-if="report.approvedBy?.length"
      class="mt-5"
      :approved-by="report.approvedBy"
    />

    <footer
      class="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2"
    >
      <ReportMeta :report />

      <NuxtLink
        :to="report.issueUrl"
        target="_blank"
        external
        class="text-ui-muted underline text-xs hover:text-ui-text"
      >
        View or dispute the report
      </NuxtLink>
    </footer>
  </div>
</template>
