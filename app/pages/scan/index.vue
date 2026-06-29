<script setup lang="ts">
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'

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

const repoQuery = computed<string>(() => {
  const q = route.query.repo
  return typeof q === 'string' ? q.trim() : ''
})

const repoInput = ref(repoQuery.value)
watch(repoQuery, (val) => {
  repoInput.value = val
})

async function handleSubmit() {
  const slug = parseRepoSlug(repoInput.value)

  if (!slug) {
    return
  }

  await router.push(`/scan/${slug.path}`)
}

const inputRef = useTemplateRef('inputRef')
function clear() {
  repoInput.value = ''
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
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span class="i-lucide:scan-search" aria-hidden="true" />
        <span class="sr-only">Scan repository</span>
      </button>
    </div>
  </form>
</template>
