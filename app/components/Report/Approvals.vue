<script setup lang="ts">
const props = defineProps<{
  approvedBy: string[]
}>()

const MAX_VISIBLE_AVATARS = 5

const visibleReviewers = computed<string[]>(() => {
  return props.approvedBy.slice(0, MAX_VISIBLE_AVATARS)
})

const restReviewersCount = computed<number>(() => {
  return props.approvedBy.length - visibleReviewers.value.length
})

function avatarUrl(reviewer: string): string {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(reviewer)}?size=48`
}

const label = computed<string>(() => {
  const count = props.approvedBy.length
  return `Approved by ${count} reviewer${count === 1 ? '' : 's'}`
})
</script>

<template>
  <div class="group flex items-center gap-2">
    <ul class="flex items-center">
      <li
        v-for="reviewer in visibleReviewers"
        :key="reviewer"
        class="-mr-1.5 transition-all last:mr-0 md:group-hover:mr-0.5"
      >
        <NuxtLink
          :to="`https://github.com/${reviewer}`"
          target="_blank"
          external
          class="block size-6 overflow-hidden rounded-full bg-ui-card ring-2 ring-ui-card"
        >
          <img
            :src="avatarUrl(reviewer)"
            :alt="`Avatar of ${reviewer}`"
            :title="reviewer"
            loading="lazy"
            width="24"
            height="24"
          />
        </NuxtLink>
      </li>
      <li
        v-if="restReviewersCount > 0"
        class="flex size-6 items-center justify-center rounded-full bg-ui-card text-[10px] text-ui-muted ring-2 ring-ui-card"
        :title="approvedBy.slice(MAX_VISIBLE_AVATARS).join(', ')"
      >
        +{{ restReviewersCount }}
      </li>
    </ul>

    <p class="text-xs text-ui-muted">{{ label }}</p>
  </div>
</template>
