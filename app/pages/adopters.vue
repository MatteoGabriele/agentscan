<script setup lang="ts">
import type { AdopterGroup } from '~~/shared/utils/group-adopters'
import { groupAdoptersByOwner } from '~~/shared/utils/group-adopters'

const SKELETON_ROWS = 8

const { data, status, error, refresh } = useAdopters()

const search = ref('')

const repositories = computed<AdopterRepository[]>(() => data.value ?? [])

const query = computed<string>(() => search.value.trim().toLowerCase())

// Matches owners too, since the repository name includes them.
const filteredRepositories = computed<AdopterRepository[]>(() => {
  if (!query.value) {
    return repositories.value
  }

  return repositories.value.filter((repository) => {
    return repository.name.toLowerCase().includes(query.value)
  })
})

const allGroups = computed<AdopterGroup[]>(() => {
  return groupAdoptersByOwner(repositories.value)
})

const groups = computed<AdopterGroup[]>(() => {
  if (!query.value) {
    return allGroups.value
  }

  return groupAdoptersByOwner(filteredRepositories.value)
})

const repositoryCount = computed<string>(() => {
  return Intl.NumberFormat('en-GB', {
    compactDisplay: 'short',
  }).format(repositories.value.length)
})

useHead({
  title: 'Used by | AgentScan',
  meta: [
    { property: 'og:title', content: 'Used by | AgentScan' },
    {
      property: 'og:description',
      content: 'Public repositories running AgentScan on their CI',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Used by</h1>
    <p class="text-ui-muted mt-2">
      Public repositories that run AgentScan in CI.
    </p>

    <p class="mt-6 text-sm text-ui-text">
      <span
        v-if="status === 'pending'"
        class="h-2.5 bg-ui-border rounded w-32 inline-block animate-pulse"
      />
      <span v-else class="tabular-nums">
        {{ repositoryCount }} repositories from
        {{ allGroups.length }}
        {{ allGroups.length === 1 ? 'account' : 'accounts' }}
      </span>
    </p>

    <CommonSearchInput
      v-model="search"
      class="mt-12"
      label="Search repositories using AgentScan"
      placeholder="Search by repository or account..."
    />
  </header>

  <div v-if="status === 'pending'" class="mt-12">
    <ul class="flex flex-col">
      <li
        v-for="row in SKELETON_ROWS"
        :key="`skeleton-${row}`"
        class="not-last:border-b border-ui-border-subtle/40"
      >
        <div class="flex items-center gap-3 py-3">
          <Skeleton width="w-8" height="h-8" rounded="full" />
          <Skeleton width="w-48" height="h-3" />
          <Skeleton class="ml-auto" width="w-10" height="h-3" />
        </div>
      </li>
    </ul>
  </div>

  <ErrorCardGeneric
    v-else-if="error"
    class="mt-12"
    :error
    :retry="refresh"
    title="Could not load the repositories"
    description="Something went wrong while loading the list."
  />

  <div v-else class="mt-12">
    <p v-if="groups.length === 0" class="text-ui-muted">
      No repository has been found under "{{ search }}"
    </p>

    <ul v-else class="flex flex-col">
      <AdopterGroupItem
        v-for="group in groups"
        :key="group.owner"
        :group
        :force-expanded="Boolean(query)"
      />
    </ul>
  </div>
</template>
