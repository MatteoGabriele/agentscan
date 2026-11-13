<script setup lang="ts">
import { MAX_PR_COUNT } from '~~/shared/scan'

const route = useRoute()

const repo = computed<string>(() => {
  const { slug } = route.params

  if (!slug) {
    return ''
  }

  if (Array.isArray(slug)) {
    return slug.join('/')
  }

  return slug
})

const { data, status, error, refresh } = useAsyncData(
  () => `scan-${repo.value}`,
  () => {
    return $fetch('/api/scan', {
      query: {
        repo: repo.value,
      },
    })
  },
  { lazy: true, server: false },
)

const { data: libraries } = useLibraries()

const isTracked = computed(() => {
  const name = data.value?.repo.toLowerCase()

  if (!name) {
    return false
  }

  return libraries.value.repos.some((item) => item.toLowerCase() === name)
})

// Built here rather than in the template: Volar rewrites `//` in component
// props as a comment, which breaks type checking for the rest of the template.
const repoUrl = computed(() => `https://github.com/${data.value?.repo}`)

const repoInput = ref(repo.value)
</script>

<template>
  <CommonSearchForm v-model="repoInput" class="mb-8" />

  <div v-if="status === 'pending'">
    <div class="flex items-baseline justify-between mb-2 text-sm">
      <p><Skeleton width="w-56" height="h-5" /></p>
    </div>

    <ul class="mt-8 flex flex-col gap-4">
      <RepoAuthorCardSkeleton v-for="n in MAX_PR_COUNT" :key="n" />
    </ul>
  </div>

  <div
    v-else-if="error && error.status === 404"
    class="text-center py-12 text-ui-muted"
  >
    <p class="text-sm">
      Repository <span class="text-ui-text font-medium">{{ repo }}</span> was
      not found. Check the name and try again.
    </p>
  </div>
  <ErrorCardGeneric
    v-else-if="error"
    :error
    :retry="refresh"
    title="Could not scan this repository"
    description="Something went wrong while reading its latest pull requests."
  />

  <div v-else-if="data">
    <div class="px-1 text-sm text-ui-muted">
      <p class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span>
          Last {{ data.pullRequests.length }} PRs in
          <NuxtLink
            :to="repoUrl"
            external
            target="_blank"
            class="underline hover:text-ui-text"
            >{{ data.repo }}</NuxtLink
          >
        </span>
        <NuxtLink
          v-if="isTracked"
          :to="`/activity/${data.repo}`"
          class="underline hover:text-ui-text"
          >Activity report</NuxtLink
        >
      </p>
      <p class="mt-1 text-xs">
        Members, collaborators, and owners are trusted and not scanned.
      </p>
    </div>

    <ul class="mt-4 flex flex-col gap-4">
      <RepoAuthorCard
        v-for="pullRequest in data.pullRequests"
        :key="pullRequest.prUrl"
        :user="pullRequest.user"
        :pr-url="pullRequest.prUrl"
        :pr-state="pullRequest.prState"
        :analysis="pullRequest.analysis"
      />
    </ul>

    <CommonDisclaimer class="mt-8 mx-auto max-w-lg text-center" />
  </div>
</template>
