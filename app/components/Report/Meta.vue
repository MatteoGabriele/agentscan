<script setup lang="ts">
defineProps<{
  report: VerifiedAutomation
}>()
</script>

<template>
  <p class="flex gap-1 items-baseline text-ui-muted text-xs">
    <span>
      Reported by
      <NuxtLink
        :external="true"
        target="_blank"
        :to="`https://github.com/${report.reportedBy}`"
        class="text-ui-muted underline hover:text-ui-text"
      >
        {{ report.reportedBy }}
      </NuxtLink>
    </span>

    <span>
      on
      <NuxtTime
        date-style="medium"
        :title="report.createdAt"
        :datetime="report.createdAt"
      />
    </span>
  </p>
</template>
