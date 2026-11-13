<script setup lang="ts">
useHead({
  title: 'Repository scan | AgentScan',
  meta: [
    { property: 'og:title', content: 'Repository scan | AgentScan' },
    {
      property: 'og:description',
      content:
        'Scan the most recent PR authors of any public GitHub repository',
    },
    { property: 'og:type', content: 'website' },
  ],
})

const route = useRoute()

const repoQuery = computed<string>(() => {
  const q = route.query.repo
  return typeof q === 'string' ? q.trim() : ''
})

const repoInput = ref(repoQuery.value)
watch(repoQuery, (val) => {
  repoInput.value = val
})
</script>

<template>
  <header class="text-center mb-8 max-w-lg mx-auto">
    <h1 class="text-2xl font-semibold">Repository scan</h1>
    <p class="text-ui-muted mt-2 text-pretty">
      Analyze the most recent PR authors of any public GitHub repository.
    </p>
  </header>

  <LazyCommonSearchForm
    v-model="repoInput"
    placeholder="owner/repo or a GitHub link"
    :hydrate-on-interaction="['click', 'focus']"
  />

  <LazyRepoSuggestions :query="repoInput" hydrate-on-visible class="mt-8" />

  <CommonDisclaimer class="mt-8 mx-auto max-w-lg text-center" />
</template>
