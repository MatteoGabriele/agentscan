<script setup lang="ts">
import type { AdopterGroup } from '~~/shared/utils/group-adopters'
import { groupAdoptersByOwner } from '~~/shared/utils/group-adopters'

const SKELETON_ROWS = 8

const { data, status, error } = useAdopters()

const search = ref('')

const repositories = computed<AdopterRepository[]>(() => data.value ?? [])

const query = computed<string>(() => search.value.trim().toLowerCase())

// The repository name carries its owner, so searching for one keeps every
// repository underneath it.
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
      Public repositories that run AgentScan in CI, using either the
      <NuxtLink
        to="https://github.com/MatteoGabriele/agentscan-action"
        target="_blank"
        external
        class="underline hover:text-ui-text"
      >
        action</NuxtLink
      >
      or the
      <NuxtLink
        to="https://github.com/apps/agentscanapp"
        target="_blank"
        external
        class="underline hover:text-ui-text"
      >
        app</NuxtLink
      >.
    </p>

    <p class="mt-6 text-sm text-ui-text">
      <span
        v-if="status === 'pending'"
        class="h-2.5 bg-ui-border rounded w-32 inline-block animate-pulse"
      />
      <span v-else class="tabular-nums">
        {{ repositories.length }} repositories from
        {{ allGroups.length }}
        {{ allGroups.length === 1 ? 'account' : 'accounts' }}
      </span>
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search by repository or account..."
      class="mt-12 w-full px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:border-ui-border/80"
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

  <p v-else-if="error" class="mt-12 text-ui-muted">
    {{ error.message }}
  </p>

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
