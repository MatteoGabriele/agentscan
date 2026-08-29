<script setup lang="ts">
const MAX_VISIBLE_ITEMS = 5

const { data, status } = await useActionRepositories()

const repositories = computed<ActionRepository[]>(() => data.value ?? [])

const showAllItems = ref(false)

const visibleItems = computed<ActionRepository[]>(() => {
  if (showAllItems.value) {
    return repositories.value
  }

  return repositories.value.slice(0, MAX_VISIBLE_ITEMS)
})

const restItemsCount = computed<number>(() => {
  return repositories.value.slice(MAX_VISIBLE_ITEMS).length
})

const { trackEvent } = useSaEvent()

function showRest() {
  showAllItems.value = true
  trackEvent('action_repository_list_expanded')
}
</script>

<template>
  <div v-if="status === 'pending' || repositories.length">
    <p
      class="text-xs text-ui-muted/80 tracking-wider font-medium text-center mb-3"
    >
      Running the action in the open
    </p>

    <div class="flex flex-wrap items-center justify-center gap-2 min-h-[30px]">
      <template v-if="status === 'pending'">
        <LazySkeleton
          v-for="i in MAX_VISIBLE_ITEMS"
          :key="`skeleton-${i}`"
          width="w-32"
          height="h-7.5"
          rounded="full"
        />
      </template>
      <template v-else>
        <NuxtLink
          v-for="repository in visibleItems"
          :key="repository.name"
          external
          target="_blank"
          rel="noopener"
          :to="repository.url"
          :title="repository.description ?? repository.name"
          class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border border-ui-border/40 bg-white/2 hover:bg-white/4 hover:border-ui-border/60 transition-all"
          @click="trackEvent('action_repository_link_clicked')"
        >
          <img
            :src="repository.avatar"
            alt=""
            aria-hidden="true"
            class="size-4 rounded-full shrink-0"
          />
          <span class="text-ui-text">{{ repository.name }}</span>
          <span class="h-3 w-px bg-ui-border/70" aria-hidden="true"></span>
          <span class="inline-flex items-center gap-1 tabular-nums">
            <span class="i-lucide:star text-[0.9em]" aria-hidden="true"></span>
            {{ formatCompactNumber(repository.stars) }}
          </span>
        </NuxtLink>

        <button
          v-if="!showAllItems && restItemsCount"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-ui-border/20 bg-white/1 text-ui-muted hover:bg-white/2 hover:border-ui-border/40 hover:text-ui-text transition-all cursor-pointer"
          @click="showRest"
        >
          <span>Show {{ restItemsCount }} more</span>
        </button>
      </template>
    </div>
  </div>
</template>
