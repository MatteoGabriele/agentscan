<script setup lang="ts">
const route = useRoute()

const username = computed(() => {
  if (!route.params.name) {
    return ''
  }

  if (typeof route.params.name === 'string') {
    return route.params.name
  }

  return route.params.name[0] ?? ''
})

// Started before the account fetch so both requests run in parallel.
const analysisKey = computed<string>(() => `analysis:${username.value}`)
const {
  data: analysis,
  status: analysisStatus,
  error: analysisError,
  refresh: refreshAnalysis,
} = useFetch(() => `/api/identify-replicant/${username.value}`, {
  query: {
    show_events: true,
  },
  key: analysisKey,
  watch: [username],
  lazy: true,
})

const accountKey = computed<string>(() => `account:${username.value}`)
const {
  data: user,
  error,
  refresh,
} = await useFetch(() => `/api/account/${username.value}`, {
  key: accountKey,
  watch: [username],
})

useSeoUser(user)
</script>

<template>
  <h1 class="sr-only">{{ username }} analysis page</h1>

  <LazyCommonSearchForm
    :hydrate-on-interaction="['click', 'focus']"
    :model-value="username"
    class="mb-6"
  />

  <div class="flex flex-col gap-6 @container">
    <LazyAnalysisCard
      v-if="user"
      :user
      :analysis
      :status="analysisStatus"
      :error="analysisError"
      :retry="refreshAnalysis"
    />

    <LazyUserCardError v-else-if="error" :error :username :retry="refresh" />
  </div>
</template>
