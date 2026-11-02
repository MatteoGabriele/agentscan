<script setup lang="ts">
import type { LibraryCategory } from '~~/shared/types/logs-api'
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'

type RepoGroup = {
  // Undefined is the "All" option.
  name?: string
  count: number
}

const SKELETON_CATEGORIES = 6

const route = useRoute()
const router = useRouter()

const { data, status, error } = useLibraries()

const search = ref('')

const query = computed<string>(() => search.value.trim().toLowerCase())

// Groups in the order their categories are listed.
const groups = computed<RepoGroup[]>(() => {
  const counts = new Map<string, number>()

  for (const { group, repos } of data.value.categories) {
    const count = counts.get(group) ?? 0

    counts.set(group, count + repos.length)
  }

  return [...counts].map(([name, count]) => ({ name, count }))
})

const groupOptions = computed<RepoGroup[]>(() => [
  { count: data.value.total },
  ...groups.value,
])

// Kept in the URL so a filtered view can be shared.
const selectedGroup = computed<string | undefined>({
  get: () => {
    const value = route.query.group
    const exists = groups.value.some((group) => group.name === value)

    return exists ? String(value) : undefined
  },
  set: (value) => {
    router.replace({ query: { ...route.query, group: value } })
  },
})

function isInSelectedGroup(category: LibraryCategory) {
  return !selectedGroup.value || category.group === selectedGroup.value
}

function matchesQuery(repo: string) {
  return repo.toLowerCase().includes(query.value)
}

const categories = computed<LibraryCategory[]>(() => {
  return data.value.categories
    .filter(isInSelectedGroup)
    .map((category) => ({
      ...category,
      repos: category.repos.filter(matchesQuery),
    }))
    .filter((category) => category.repos.length > 0)
})

const emptyMessage = computed(() => {
  const area = selectedGroup.value ? ` in ${selectedGroup.value}` : ''

  return `No tracked repository matches "${search.value}"${area}.`
})

// Untracked repos can still be scanned on demand.
const scanSlug = computed(() => parseRepoSlug(search.value)?.path)

function splitRepo(repo: string) {
  const [owner = '', name = ''] = repo.split('/')

  return { owner, name }
}

useHead({
  title: 'Tracked repositories | AgentScan',
  meta: [
    { property: 'og:title', content: 'Tracked repositories | AgentScan' },
    {
      property: 'og:description',
      content:
        'The repositories behind Ecosystem Activity, scanned every hour.',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Tracked repositories</h1>
    <p class="text-ui-muted mt-2 text-pretty">
      The repositories behind
      <NuxtLink to="/activity" class="underline">Ecosystem Activity</NuxtLink>,
      scanned every hour. Pick one to see who opens its pull requests.
    </p>

    <p class="mt-6 text-sm text-ui-text">
      <span
        v-if="status === 'pending'"
        class="h-2.5 bg-ui-border rounded w-32 inline-block animate-pulse"
      />
      <span v-else class="tabular-nums">
        {{ data.total }} repositories in
        {{ data.categories.length }}
        {{ data.categories.length === 1 ? 'category' : 'categories' }}
      </span>
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search by repository or owner..."
      class="mt-12 w-full px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:border-ui-border/80"
    />

    <div
      v-if="groups.length > 1"
      role="group"
      aria-label="Filter by area"
      class="mt-4 flex flex-wrap justify-center md:justify-start gap-2"
    >
      <button
        v-for="group in groupOptions"
        :key="group.name ?? 'all'"
        type="button"
        :aria-pressed="selectedGroup === group.name"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
        :class="
          selectedGroup === group.name
            ? 'border-ui-border/60 bg-ui-border/30 text-ui-text'
            : 'border-ui-border-subtle/40 text-ui-muted hover:bg-ui-border/15 hover:text-ui-text'
        "
        @click="selectedGroup = group.name"
      >
        {{ group.name ?? 'All' }}
        <span class="tabular-nums text-ui-muted/70">{{ group.count }}</span>
      </button>
    </div>
  </header>

  <div
    v-if="status === 'pending'"
    class="mt-12 columns-1 @xl:columns-2 @2xl:columns-3 gap-10"
  >
    <div
      v-for="index in SKELETON_CATEGORIES"
      :key="index"
      class="flex flex-col gap-2 mb-10 break-inside-avoid"
    >
      <Skeleton width="w-40" height="h-3" />
      <Skeleton v-for="row in 5" :key="row" width="w-48" />
    </div>
  </div>

  <p v-else-if="error" class="mt-12 text-ui-muted">
    {{ error.message }}
  </p>

  <div v-else class="mt-12">
    <p v-if="categories.length === 0" class="text-ui-muted">
      {{ emptyMessage }}
      <button
        v-if="selectedGroup"
        type="button"
        class="underline hover:text-ui-text"
        @click="selectedGroup = undefined"
      >
        Search all areas
      </button>
      <NuxtLink v-if="scanSlug" :to="`/scan/${scanSlug}`" class="underline">
        Scan it instead
      </NuxtLink>
    </p>

    <div v-else class="columns-1 @xl:columns-2 @2xl:columns-3 gap-10">
      <section
        v-for="category in categories"
        :key="category.name"
        class="mb-10 break-inside-avoid"
      >
        <h2
          class="flex items-baseline justify-between gap-2 text-xs uppercase tracking-wider text-ui-muted/70 font-semibold"
        >
          {{ category.name }}
          <span class="tabular-nums font-normal">{{
            category.repos.length
          }}</span>
        </h2>
        <ul class="mt-3 flex flex-col">
          <li v-for="repo in category.repos" :key="repo">
            <NuxtLink
              :to="`/activity/${repo}`"
              class="group flex truncate py-1 text-sm"
            >
              <span class="text-ui-muted/70">{{ splitRepo(repo).owner }}/</span>
              <span class="text-ui-text group-hover:underline">{{
                splitRepo(repo).name
              }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
