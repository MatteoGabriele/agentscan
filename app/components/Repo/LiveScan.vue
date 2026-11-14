<script setup lang="ts">
import { MAX_PR_COUNT, SCAN_RESPONSE_VERSION } from '~~/shared/scan'
import type { PullRequestRowData } from '~~/shared/types/scan'
import {
  countClassifications,
  getAuthorClassification,
} from '~~/shared/utils/scan-pull-requests'

const props = defineProps<{
  repo: string
}>()

const emit = defineEmits<{
  notFound: []
}>()

const ERROR_TITLE = 'Could not scan the latest pull requests'
const EMPTY_MESSAGE = 'No recent pull requests from outside contributors.'

const headingId = useId()

// Client only: analyzing every author can take up to a minute, and the
// stored report above shouldn't wait for it.
const { data, status, error, refresh } = useAsyncData(
  () => `scan-${props.repo.toLowerCase()}`,
  () =>
    $fetch('/api/scan', {
      query: { repo: props.repo, v: SCAN_RESPONSE_VERSION },
    }),
  { lazy: true, server: false },
)

const { data: verifiedAutomations } = useVerifiedAutomations()

function isCommunityReported(user: { login: string; id?: number }): boolean {
  const login = user.login.toLowerCase()

  return (verifiedAutomations.value ?? []).some(
    (account) =>
      account.username.toLowerCase() === login ||
      (user.id !== undefined && account.id === user.id),
  )
}

const rows = computed<PullRequestRowData[]>(() =>
  (data.value?.pullRequests ?? []).map((pullRequest) => ({
    number: pullRequest.number,
    url: pullRequest.url,
    title: pullRequest.title,
    createdAt: pullRequest.createdAt,
    state: pullRequest.state,
    classification: getAuthorClassification(pullRequest.analysis),
    author: {
      login: pullRequest.user.login,
      avatarUrl: pullRequest.user.avatar_url,
    },
    communityReported: isCommunityReported(pullRequest.user),
  })),
)

const classificationCounts = computed(() => countClassifications(rows.value))

const accountCount = computed<number>(
  () => new Set(rows.value.map((row) => row.author.login.toLowerCase())).size,
)

const countsLabel = computed<string>(
  () =>
    `${rows.value.length} pull requests from ${accountCount.value} accounts`,
)

// The scan doesn't start until the page hydrates, so "idle" is loading too.
const isScanning = computed<boolean>(
  () => status.value === 'idle' || status.value === 'pending',
)

const errorDescription = computed<string>(() =>
  error.value?.status === 429
    ? "GitHub's rate limit was reached. Try again in a few minutes."
    : 'Something went wrong while reading its latest pull requests.',
)

const statusMessage = computed<string>(() => {
  if (isScanning.value) {
    return 'Scanning the latest pull requests…'
  }

  // The error card announces itself.
  if (error.value) {
    return ''
  }

  return rows.value.length
    ? `Scan complete: ${countsLabel.value}`
    : `Scan complete: ${EMPTY_MESSAGE}`
})

watch(
  () => error.value?.status,
  (code) => {
    if (code === 404) {
      emit('notFound')
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="flex flex-col gap-4" :aria-busy="isScanning">
    <header class="flex flex-col gap-1">
      <h2 :id="headingId" class="font-semibold">Latest pull requests</h2>
      <p class="text-sm text-ui-muted text-pretty">
        The {{ MAX_PR_COUNT }} most recent pull requests from outside
        contributors. Owners, members, and collaborators are skipped.
      </p>
    </header>

    <p role="status" aria-live="polite" class="sr-only">{{ statusMessage }}</p>

    <template v-if="isScanning">
      <!-- Same shape as the loaded summary below, so nothing jumps. -->
      <div class="flex flex-col gap-2">
        <p class="text-sm text-ui-muted">
          Analyzing each author's recent activity. This can take up to a minute.
        </p>
        <RepoClassificationSharesSkeleton />
      </div>
      <RepoPullRequestList
        :rows="[]"
        :labelledby="headingId"
        :placeholder-count="MAX_PR_COUNT"
      />
    </template>

    <ErrorCardGeneric
      v-else-if="error"
      :error
      :retry="refresh"
      :title="ERROR_TITLE"
      :description="errorDescription"
    />

    <p v-else-if="!rows.length" class="text-sm text-ui-muted">
      {{ EMPTY_MESSAGE }}
    </p>

    <template v-else>
      <div class="flex flex-col gap-2">
        <p class="text-sm">{{ countsLabel }}</p>
        <RepoClassificationShares
          :counts="classificationCounts.counts"
          :insufficient="classificationCounts.insufficient"
          :community-reported="classificationCounts.communityReported"
        />
      </div>
      <RepoPullRequestList :rows :labelledby="headingId" />
    </template>
  </section>
</template>
