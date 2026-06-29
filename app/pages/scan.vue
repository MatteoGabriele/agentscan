<script setup lang="ts">
import type { GitHubUser, IdentifyResult } from '@unveil/identity'
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'

type RepoScanAuthor = {
  user: GitHubUser
  analysis: IdentifyResult
  eventsCount: number
}

type RepoScanResult = {
  authors: RepoScanAuthor[]
  repo: string
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

useHead({
  title: 'Repository scan | AgentScan',
  meta: [
    { property: 'og:title', content: 'Repository scan | AgentScan' },
    {
      property: 'og:description',
      content: 'Scan the most recent PR authors of any public GitHub repository',
    },
    { property: 'og:type', content: 'website' },
  ],
})

const route = useRoute()
const router = useRouter()

const cache = useState<Record<string, { result: RepoScanResult; cachedAt: number }>>(
  'scan-cache',
  () => ({}),
)

const repoQuery = computed<string>(() => {
  const q = route.query.repo
  return typeof q === 'string' ? q.trim() : ''
})

const repoInput = ref(repoQuery.value)
watch(repoQuery, (val) => {
  repoInput.value = val
})

function getCached(repo: string): RepoScanResult | null {
  const entry = cache.value[repo]
  if (!entry) {
    return null
  }
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    const { [repo]: _, ...rest } = cache.value
    cache.value = rest
    return null
  }
  return entry.result
}

const data = ref<RepoScanResult | null>(null)
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const error = ref<Error | null>(null)

watch(
  repoQuery,
  async (val) => {
    if (!val) {
      data.value = null
      status.value = 'idle'
      error.value = null
      return
    }

    const cached = getCached(val)
    if (cached) {
      data.value = cached
      status.value = 'success'
      return
    }

    status.value = 'pending'
    error.value = null

    try {
      const result = await $fetch<RepoScanResult>(`/api/scan?repo=${encodeURIComponent(val)}`)
      data.value = result
      status.value = 'success'
      cache.value[val] = { result, cachedAt: Date.now() }
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } } & Error
      error.value = new Error(e.data?.message ?? e.message ?? 'Failed to scan repository')
      status.value = 'error'
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  const slug = parseRepoSlug(repoInput.value)

  if (!slug) {
    return
  }

  await router.push({
    query: {
      repo: `${slug.owner}/${slug.repo}`,
    },
  })
}

const inputRef = useTemplateRef('inputRef')
function clear() {
  repoInput.value = ''
  router.replace({ query: {} })
  inputRef.value?.focus()
}
</script>

<template>
  <header class="text-center md:text-left mb-8">
    <h1 class="text-2xl font-semibold">Repository scan</h1>
    <p class="text-gh-muted mt-2">
      Analyze the most recent PR authors of any public GitHub repository, skipping bots and
      duplicate contributors.
    </p>
  </header>

  <form
    class="flex items-center gap-2 border border-gh-border/60 relative rounded-full pl-6 pr-4 py-3 focus-within:border-gh-border-light"
    @submit.prevent="handleSubmit"
  >
    <label class="flex-1" for="repoUrl">
      <span class="sr-only">Enter repository URL or owner/repo</span>
      <input
        id="repoUrl"
        ref="inputRef"
        v-model="repoInput"
        class="outline-none w-full"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        autocapitalize="none"
        placeholder="github.com/owner/repo"
      />
    </label>

    <div class="flex items-center gap-2">
      <button
        v-if="repoInput"
        type="button"
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all"
        @click="clear"
      >
        <span class="i-lucide:x" />
        <span class="sr-only">Clear input field</span>
      </button>

      <button
        type="submit"
        :disabled="!repoInput || status === 'pending'"
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span
          v-if="status === 'pending'"
          class="i-lucide:loader-circle animate-spin"
          aria-hidden="true"
        />
        <span v-else class="i-lucide:scan-search" aria-hidden="true" />
        <span class="sr-only">Scan repository</span>
      </button>
    </div>
  </form>

  <div v-if="error" class="mt-8">
    <ErrorCardGeneric :error />
  </div>

  <div
    v-else-if="status === 'pending'"
    class="mt-12 flex flex-col items-center gap-3 text-gh-muted"
  >
    <span class="i-lucide:loader-circle animate-spin text-2xl" aria-hidden="true" />
    <p class="text-sm">Scanning PR authors...</p>
  </div>

  <template v-else-if="data">
    <div class="mt-10">
      <div class="flex items-baseline justify-between mb-2 text-sm text-gh-muted">
        <p>
          {{ data.authors.length }} unique PR authors in
          <NuxtLink
            :to="`https://github.com/${data.repo}`"
            external
            target="_blank"
            class="underline hover:text-gh-text"
          >
            {{ data.repo }}
          </NuxtLink>
        </p>
        <div class="hidden sm:flex items-center gap-3 text-xs font-mono">
          <span class="w-20 text-right">Classification</span>
          <span class="w-10 text-right">Score</span>
        </div>
      </div>

      <ul class="border-t border-gh-border-light">
        <li v-for="author in data.authors" :key="author.user.login">
          <RepoAuthorCard :user="author.user" :analysis="author.analysis" />
        </li>
      </ul>
    </div>
  </template>
</template>
