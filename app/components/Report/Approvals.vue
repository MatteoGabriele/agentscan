<script setup lang="ts">
const props = defineProps<{
  approvedBy: string[]
}>()

const MAX_VISIBLE_AVATARS = 15

const showAllReviewers = ref(false)

const visibleReviewers = computed<string[]>(() => {
  if (showAllReviewers.value) {
    return props.approvedBy
  }

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

function showRest() {
  showAllReviewers.value = true
}
</script>

<template>
  <div class="group flex items-center gap-2">
    <ul class="flex items-center flex-wrap gap-y-1.5">
      <li
        v-for="reviewer in visibleReviewers"
        :key="reviewer"
        class="hover:z-10 -mr-0.5"
      >
        <Tooltip :label="reviewer">
          <NuxtLink
            :to="`https://github.com/${reviewer}`"
            target="_blank"
            external
            class="block size-6 overflow-hidden rounded-full bg-ui-card ring-2 ring-ui-card filter-saturate-0 hover:filter-saturate-100 hover:scale-115 transition-all"
          >
            <img
              :src="avatarUrl(reviewer)"
              :alt="`Avatar of ${reviewer}`"
              loading="lazy"
              width="24"
              height="24"
              class="size-full"
            />
          </NuxtLink>
        </Tooltip>
      </li>

      <li v-if="restReviewersCount > 0" class="-mr-1.5 last:mr-0 hover:z-10">
        <Tooltip :label="`Show ${restReviewersCount} more`">
          <button
            type="button"
            :aria-label="`Show ${restReviewersCount} more`"
            class="flex size-6 items-center justify-center rounded-full bg-ui-card text-[10px] tabular-nums text-ui-muted ring-2 ring-ui-card hover:text-ui-text hover:scale-115 transition-all"
            @click="showRest"
          >
            +{{ restReviewersCount }}
          </button>
        </Tooltip>
      </li>
    </ul>

    <p class="text-xs text-ui-muted">{{ label }}</p>
  </div>
</template>
