<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    items: AvatarStackItem[]
    pending?: boolean
    max?: number
    moreUrl?: string
  }>(),
  {
    pending: false,
    max: 0,
    moreUrl: undefined,
  },
)

const showAllItems = ref(false)

const visibleItems = computed<AvatarStackItem[]>(() => {
  if (showAllItems.value || !props.max) {
    return props.items
  }

  return props.items.slice(0, props.max)
})

const restItemsCount = computed<number>(() => {
  return props.items.length - visibleItems.value.length
})

function showRest() {
  showAllItems.value = true
}
</script>

<template>
  <div class="flex flex-col items-center group">
    <p
      class="text-xs text-ui-muted/80 tracking-wider font-medium mb-2 group-hover:text-ui-text transition-colors"
    >
      {{ label }}
    </p>

    <ul
      class="flex items-center flex-wrap justify-center gap-y-1.5 min-h-7.5 max-w-72"
    >
      <template v-if="pending">
        <li
          v-for="index in max || 5"
          :key="`skeleton-${index}`"
          class="md:-mx-1"
        >
          <Skeleton width="w-7.5" height="h-7.5" rounded="full" />
        </li>
      </template>

      <template v-else>
        <li
          v-for="(item, index) in visibleItems"
          :key="index"
          class="md:-mx-1 hover:z-10"
        >
          <NuxtLink
            external
            target="_blank"
            :to="item.url"
            :title="item.title ?? item.name"
            class="block size-7.5 overflow-hidden rounded-full bg-ui-card ring-2 ring-ui-bg filter-saturate-0 hover:filter-saturate-100 hover:scale-115 transition-all"
          >
            <img :src="item.avatar" :alt="item.name" class="size-full" />
          </NuxtLink>
        </li>

        <li v-if="restItemsCount" class="md:-mx-1 hover:z-10">
          <NuxtLink
            v-if="moreUrl"
            :to="moreUrl"
            :title="`See all ${items.length} on GitHub`"
            class="flex items-center justify-center size-7.5 rounded-full ring-2 ring-ui-bg bg-ui-bg border border-ui-border/40 text-[0.65rem] font-medium tabular-nums text-ui-muted hover:text-ui-text hover:scale-115 transition-all"
          >
            +{{ restItemsCount }}
          </NuxtLink>

          <button
            v-else
            type="button"
            :title="`Show ${restItemsCount} more`"
            class="size-7.5 rounded-full ring-2 ring-ui-bg bg-ui-bg border border-ui-border/40 text-[0.65rem] font-medium tabular-nums text-ui-muted hover:text-ui-text hover:scale-115 transition-all"
            @click="showRest"
          >
            +{{ restItemsCount }}
          </button>
        </li>
      </template>
    </ul>
  </div>
</template>
