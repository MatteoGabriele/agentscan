<script setup lang="ts">
const props = defineProps<{
  query?: string
}>()

const MAX_VISIBLE_ITEMS = 12

const { data, status } = await useLibraries()

const showAllItems = ref(false)

const search = computed<string>(() => {
  return (props.query ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
})

const matches = computed<string[]>(() => {
  const repos = data.value?.repos ?? []

  if (!search.value) {
    return repos
  }

  return repos.filter((name) => name.toLowerCase().includes(search.value))
})

const visibleItems = computed<string[]>(() => {
  if (showAllItems.value) {
    return matches.value
  }

  return matches.value.slice(0, MAX_VISIBLE_ITEMS)
})

const hiddenItemsCount = computed<number>(() => {
  return matches.value.length - visibleItems.value.length
})

watch(search, () => {
  showAllItems.value = false
})

const { trackEvent } = useSaEvent()
</script>

<template>
  <div v-if="status === 'pending' || matches.length">
    <p
      class="text-xs text-ui-muted/80 tracking-wider font-medium text-center mb-3"
    >
      <template v-if="search">
        Repositories we already track matching your search
      </template>
      <template v-else> Or scan one of the repositories we track </template>
    </p>

    <div
      class="flex flex-wrap items-start justify-center gap-2"
      :class="
        showAllItems &&
        'max-h-56 overflow-y-auto pb-8 [mask-image:linear-gradient(to_bottom,#000_calc(100%-3rem),transparent)]'
      "
    >
      <template v-if="status === 'pending'">
        <LazySkeleton
          v-for="index in MAX_VISIBLE_ITEMS"
          :key="`skeleton-${index}`"
          width="w-28"
          height="h-7.5"
          rounded="full"
        />
      </template>
      <template v-else>
        <NuxtLink
          v-for="name in visibleItems"
          :key="name"
          :to="`/scan/${name}`"
          class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-ui-border/40 hover:bg-ui-muted/15 hover:border-ui-border/60 transition-all"
          @click="trackEvent('scan_suggested_repository_clicked')"
        >
          {{ name }}
        </NuxtLink>

        <button
          v-if="hiddenItemsCount"
          type="button"
          class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-ui-border/20 text-ui-muted hover:bg-ui-muted/10 hover:border-ui-border/40 hover:text-ui-text transition-all"
          @click="showAllItems = true"
        >
          Show {{ hiddenItemsCount }} more
        </button>
      </template>
    </div>
  </div>
</template>
