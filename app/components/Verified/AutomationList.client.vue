<script setup lang="ts">
const { data, pending } = useVerifiedAutomations()

const MAX_VISIBLE_ITEMS = 4
const items = computed<VerifiedAutomation[]>(
  () => data.value?.toReversed() ?? [],
)

const recentItems = computed<VerifiedAutomation[]>(() => {
  return items.value.slice(0, MAX_VISIBLE_ITEMS)
})
const restItemsCount = computed<number>(() => {
  return items.value.slice(MAX_VISIBLE_ITEMS).length
})
</script>

<template>
  <div>
    <p
      class="text-xs text-gh-muted/80 tracking-wider font-medium text-center mb-3"
    >
      Latest flagged by the community
    </p>

    <div class="flex flex-wrap items-center justify-center gap-2 min-h-[30px]">
      <template v-if="pending">
        <Skeleton
          v-for="i in MAX_VISIBLE_ITEMS"
          :key="`skeleton-${i}`"
          width="w-24"
          height="h-7.5"
          rounded="full"
        />
      </template>
      <template v-else>
        <NuxtLink
          v-for="account in recentItems"
          :key="account.username"
          :to="{ name: 'user-name', params: { name: account.username } }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gh-border/40 bg-white/2 hover:bg-white/4 hover:border-gh-border/60 transition-all"
        >
          <span class="text-gh-text">@{{ account.username }}</span>
        </NuxtLink>

        <NuxtLink
          :to="{ name: 'automations' }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gh-border/20 bg-white/1 text-gh-muted hover:bg-white/2 hover:border-gh-border/40 hover:text-gh-text transition-all"
        >
          <span>View {{ restItemsCount }} more</span>
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
