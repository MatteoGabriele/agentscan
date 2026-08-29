<script setup lang="ts">
import { formatCompactNumber } from '~~/shared/utils/numbers'

const SKELETON_ROWS = 8

const { data, status, error } = useAdopters()
const { trackEvent } = useSaEvent()

const search = ref('')

const repositories = computed<AdopterRepository[]>(() => data.value ?? [])

const filteredRepositories = computed<AdopterRepository[]>(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return repositories.value
  }

  return repositories.value.filter((repository) => {
    return repository.name.toLowerCase().includes(query)
  })
})

useHead({
  title: 'Used by | AgentScan',
  meta: [
    { property: 'og:title', content: 'Used by | AgentScan' },
    {
      property: 'og:description',
      content: 'Public repositories running AgentScan on their pull requests',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Used by</h1>
    <p class="text-ui-muted mt-2">
      Public repositories running AgentScan on their pull requests, either
      through the
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
      >. Private repositories are never listed.
    </p>

    <p class="mt-6 text-sm text-ui-text">
      <span
        v-if="status === 'pending'"
        class="h-2.5 bg-ui-border rounded w-32 inline-block animate-pulse"
      />
      <span v-else class="tabular-nums">
        {{ repositories.length }} repositories
      </span>
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search by repository..."
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
    <p v-if="filteredRepositories.length === 0" class="text-ui-muted">
      No repository has been found under "{{ search }}"
    </p>

    <ul v-else class="flex flex-col">
      <li
        v-for="repository in filteredRepositories"
        :key="repository.name"
        class="not-last:border-b border-ui-border-subtle/40"
      >
        <NuxtLink
          external
          target="_blank"
          rel="noopener"
          :to="repository.url"
          class="group flex items-center gap-3 py-3"
          @click="trackEvent('adopter_repository_link_clicked')"
        >
          <img
            :src="repository.avatar"
            alt=""
            aria-hidden="true"
            class="size-8 rounded-full shrink-0 bg-ui-card"
          />

          <span
            class="font-mono text-sm truncate group-hover:text-ui-muted transition-colors"
          >
            {{ repository.name }}
          </span>

          <span
            class="ml-auto shrink-0 inline-flex items-center gap-1 text-xs text-ui-muted tabular-nums"
          >
            <span class="i-lucide:star text-[0.9em]" aria-hidden="true" />
            {{ formatCompactNumber(repository.stars) }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
