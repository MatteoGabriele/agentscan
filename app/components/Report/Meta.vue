<script setup lang="ts">
defineProps<{
  report: VerifiedAutomation
}>()
</script>

<template>
  <p class="flex gap-1 items-baseline text-gh-muted text-xs">
    <span>
      Reported by
      <NuxtLink
        :external="true"
        target="_blank"
        :to="`https://github.com/${report.reportedBy}`"
        class="text-gh-muted underline hover:text-gh-text"
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
