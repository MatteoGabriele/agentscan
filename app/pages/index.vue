<script setup lang="ts">
// Same list (and order) VerifiedAutomationList shows.
const RECENT_REPORTS_COUNT = 4
const verifiedAutomations = useVerifiedAutomations()

// Warm the route chunks once the page is idle: activity first, then the
// recently reported accounts.
onNuxtReady(async () => {
  await preloadRouteComponents('/activity')

  const { data } = await verifiedAutomations
  const recent = data.value?.toReversed().slice(0, RECENT_REPORTS_COUNT) ?? []

  await Promise.all(
    recent.map(({ username }) =>
      preloadRouteComponents({ name: 'user-name', params: { name: username } }),
    ),
  )
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <CommonSearchForm
      autofocus
      :examples="['torvalds', 'nuxt/nuxt']"
      class="mb-16"
    />
  </div>

  <LazyVerifiedAutomationList hydrate-on-interaction />

  <LazyCommunityStrip
    hydrate-on-visible
    class="hidden w-full md:flex absolute bottom-8 left-0"
  />
</template>
