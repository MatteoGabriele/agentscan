<script setup lang="ts">
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'

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
const router = useRouter()

const repoQuery = computed<string>(() => {
  const q = route.query.repo
  return typeof q === 'string' ? q.trim() : ''
})

const repoInput = ref(repoQuery.value)
watch(repoQuery, (val) => {
  repoInput.value = val
})

async function handleSubmit(value: string) {
  const slug = parseRepoSlug(value)

  if (!slug) {
    return
  }

  await router.push(`/scan/${slug.path}`)
}
</script>

<template>
  <header class="text-center mb-8 max-w-lg mx-auto">
    <h1 class="text-2xl font-semibold">Repository scan</h1>
    <p class="text-gh-muted mt-2 text-pretty">
      Analyze the most recent PR authors of any public GitHub repository.
    </p>
  </header>

  <RepoForm v-model="repoInput" @submit="handleSubmit" />

  <p
    class="mt-4 mx-auto max-w-lg text-xs text-gh-muted/60 leading-relaxed text-pretty text-center"
  >
    Results are based on pattern analysis and should be interpreted as possible
    signals, not conclusions. Always verify findings with additional context.
  </p>
</template>
