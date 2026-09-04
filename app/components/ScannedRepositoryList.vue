<script setup lang="ts">
const MAX_ITEMS = 10

const { data, status } = await useLibraries()

const showAllItems = ref(false)
const displayItems = computed(() => {
  const repos = data.value?.repos ?? []

  if (showAllItems.value) {
    return repos
  }

  return repos.slice(0, MAX_ITEMS)
})
</script>

<template>
  <div class="flex flex-col gap-2 items-start">
    <div v-if="status === 'pending'" class="flex flex-col gap-2 w-full">
      <Skeleton v-for="index in MAX_ITEMS" :key="index" width="w-40" />
    </div>
    <ul v-else>
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
      v-if="status !== 'pending' && !showAllItems"
      class="text-sm text-ui-muted/70 hover:text-ui-text"
      @click="showAllItems = true"
    >
      Show all
    </button>
  </div>
</template>
