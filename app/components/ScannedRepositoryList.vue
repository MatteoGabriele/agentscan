<script setup lang="ts">
import { libraries } from '~~/shared/daily-scan'

const MAX_ITEMS = 10

const showAllItems = ref(false)
const displayItems = computed(() => {
  if (showAllItems.value) {
    return libraries
  }

  return libraries.slice(0, MAX_ITEMS)
})
</script>

<template>
  <div class="flex flex-col gap-2 items-start">
    <ul>
      <li v-for="name in displayItems" :key="name">
        <NuxtLink
          class="underline"
          external
          :href="`https://github.com/${name}`"
          >{{ name }}</NuxtLink
        >
      </li>
    </ul>
    <button
      v-if="!showAllItems"
      class="text-sm text-ui-muted/70 hover:text-ui-text"
      @click="showAllItems = true"
    >
      Show all
    </button>
  </div>
</template>
