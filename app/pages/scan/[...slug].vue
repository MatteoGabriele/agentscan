<script setup lang="ts">
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'
import { MAX_PR_COUNT } from '~~/shared/scan'

const route = useRoute()
const router = useRouter()

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

const { data, status, error } = useAsyncData(
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

const repoInput = ref(repo.value)

async function handleSubmit(value: string) {
  const slug = parseRepoSlug(value)

  if (!slug) {
    return
  }

  await router.push(`/scan/${slug.path}`)
}
</script>

<template>
  <RepoForm v-model="repoInput" class="mb-8" @submit="handleSubmit" />

  <div v-if="status === 'pending'">
    <div class="flex items-baseline justify-between mb-2 text-sm">
      <p><Skeleton width="w-56" height="h-5" /></p>
    </div>

    <ul class="mt-8 flex flex-col gap-4">
      <RepoAuthorCardSkeleton v-for="n in MAX_PR_COUNT" :key="n" />
    </ul>
  </div>

  <div v-else-if="error" class="text-center py-12 text-ui-muted">
    <p v-if="error.status === 404" class="text-sm">
      Repository <span class="text-ui-text font-medium">{{ repo }}</span> was
      not found. Check the name and try again.
    </p>
    <p v-else class="text-sm">{{ error.message }}</p>
  </div>

  <div v-else-if="data">
    <div class="flex flex-col justify-between mb-2 ml-2 text-sm text-ui-muted">
      <p>
        Last {{ data.pullRequests.length }} PRs in
        <NuxtLink
          :to="`https://github.com/${data.repo}`"
          external
          target="_blank"
          class="underline hover:text-ui-text"
        >
          {{ data.repo }}
        </NuxtLink>
      </p>
      <p class="text-xs text-ui-muted/80 mt-1">
        Members, collaborators, and owners are excluded from the scan, as
        they're trusted by default.
      </p>
    </div>

    <ul class="mt-8 flex flex-col gap-4">
      <RepoAuthorCard
        v-for="pullRequest in data.pullRequests"
        :key="pullRequest.prUrl"
        :user="pullRequest.user"
        :pr-url="pullRequest.prUrl"
        :pr-state="pullRequest.prState"
        :analysis="pullRequest.analysis"
      />
    </ul>

    <p
      class="mt-8 mx-auto max-w-lg text-xs text-ui-muted/60 leading-relaxed text-pretty text-center"
    >
      Results are based on pattern analysis and should be interpreted as
      possible signals, not conclusions. Always verify findings with additional
      context.
    </p>
  </div>
</template>
