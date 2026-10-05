<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ActivityCategory } from '~~/shared/types/activity'

const { data: hourlyWindow } = await useActivityHourlyWindow()

const MIN_PRS_PER_REPO = 20
const PRS_PER_REPO = 20

type SortKey =
  | 'pr'
  | 'score'
  | 'classification'
  | 'verdict'
  | 'probability'
  | 'confidence'
  | 'status'

type SortDirection = 'asc' | 'desc'

type SortState = {
  key: SortKey
  direction: SortDirection
}

const sortStates = ref<Record<string, SortState>>({})

const uniqueEntries = computed(() => {
  const results = hourlyWindow.value?.results ?? []
  const entries = new Map<string, (typeof results)[number]>()

  for (const item of results) {
    if (!item.repo_name || item.pr == null) {
      continue
    }

    const key = `${item.repo_name}#${item.pr}`
    const existing = entries.get(key)

    if (!existing) {
      entries.set(key, item)
      continue
    }

    const existingCreatedAt = new Date(existing.created_at ?? 0).getTime()
    const itemCreatedAt = new Date(item.created_at ?? 0).getTime()

    if (itemCreatedAt > existingCreatedAt) {
      entries.set(key, item)
    }
  }

  return [...entries.values()]
})

const source = computed(() =>
  uniqueEntries.value.filter(
    (result) =>
      'text_probability' in result &&
      'text_confidence' in result &&
      result.score !== -1,
  ),
)

function getScoreClassification(score: number): ActivityCategory {
  if (score < 50) {
    return 'automation'
  }

  if (score < 70) {
    return 'mixed'
  }

  return 'organic'
}

const groupedPrs = computed(() => {
  const groups = new Map<string, NonNullable<typeof source.value>>()

  for (const item of source.value ?? []) {
    const repoName = item.repo_name ?? 'Unknown repository'
    const group = groups.get(repoName)

    if (group) {
      group.push(item)
    } else {
      groups.set(repoName, [item])
    }
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length >= MIN_PRS_PER_REPO)
    .map(([repoName, items]) => {
      const sortedItems = items.toSorted((a, b) => {
        const aDate = new Date(a.created_at ?? 0).getTime()
        const bDate = new Date(b.created_at ?? 0).getTime()

        return bDate - aDate
      })

      const recentItems = sortedItems.slice(0, PRS_PER_REPO)

      const aiCount = recentItems.filter(
        (item) => item.text_verdict === 'ai',
      ).length

      const humanCount = recentItems.filter(
        (item) => item.text_verdict === 'human',
      ).length

      return {
        repoName,
        total: items.length,
        aiCount,
        humanCount,
        items: recentItems,
      }
    })
    .toSorted((a, b) => b.total - a.total)
})

function toggleSort(repoName: string, key: SortKey) {
  const current = sortStates.value[repoName]

  if (current?.key === key) {
    sortStates.value[repoName] = {
      key,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    }

    return
  }

  sortStates.value[repoName] = {
    key,
    direction: 'asc',
  }
}

function getSortValue(
  item: NonNullable<typeof source.value>[number],
  key: SortKey,
): string | number {
  switch (key) {
    case 'pr':
      return item.pr ?? -1

    case 'score':
      return item.score ?? -1

    case 'classification': {
      const classification = getScoreClassification(item.score ?? 0)

      const order: Record<ActivityCategory, number> = {
        automation: 0,
        mixed: 1,
        organic: 2,
      }

      return order[classification]
    }

    case 'verdict':
      return item.text_verdict ?? ''

    case 'probability':
      return item.text_probability ?? -1

    case 'confidence':
      return item.text_confidence ?? -1

    case 'status':
      return item.pr_status ?? ''
  }
}

function getSortedItems(
  repoName: string,
  items: NonNullable<typeof source.value>,
) {
  const sort = sortStates.value[repoName]

  if (!sort) {
    return items
  }

  const direction = sort.direction === 'asc' ? 1 : -1

  return items.toSorted((a, b) => {
    const aValue = getSortValue(a, sort.key)
    const bValue = getSortValue(b, sort.key)

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction
    }

    return (
      String(aValue).localeCompare(String(bValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    )
  })
}

function isSortedBy(repoName: string, key: SortKey) {
  return sortStates.value[repoName]?.key === key
}

function getSortDirection(repoName: string) {
  return sortStates.value[repoName]?.direction
}

function getPrUrl(repoName: string, pr: number) {
  return `https://github.com/${repoName}/pull/${pr}`
}

function formatPercentage(value?: number | null) {
  if (value == null) {
    return '—'
  }

  return `${Math.round(value * 100)}%`
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h2 class="text-center">PR descriptions analysis</h2>

      <p class="text-center text-sm text-ui-muted">
        Latest 20 analyzed PRs per repository in the last 24-hour window, for
        repositories with at least 20 PRs.
      </p>
    </div>

    <div v-if="groupedPrs.length" class="space-y-2">
      <details
        v-for="group in groupedPrs"
        :key="group.repoName"
        name="repo-details"
        class="group overflow-hidden rounded-lg border border-ui-border"
      >
        <summary
          class="flex cursor-pointer list-none items-center gap-3 px-3 py-3 select-none hover:bg-ui-bg-muted sm:gap-4 sm:px-4"
        >
          <span
            class="i-lucide:chevron-right size-4 shrink-0 text-ui-muted transition-transform group-open:rotate-90"
          />

          <div class="min-w-0 flex-1">
            <div class="truncate font-medium">
              {{ group.repoName }}
            </div>

            <div class="text-xs text-ui-muted">
              Latest {{ group.items.length }} of {{ group.total }} PRs
            </div>
          </div>

          <div class="shrink-0">
            <!-- Mobile -->
            <div class="flex flex-col gap-2 text-xs sm:hidden">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="size-2 shrink-0 rounded-full bg-ui-organic" />

                  <span class="text-ui-muted"> Human </span>
                </div>

                <span class="tabular-nums">
                  {{ group.humanCount }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="size-2 shrink-0 bg-ui-automation" />

                  <span class="text-ui-muted"> AI </span>
                </div>

                <span class="tabular-nums">
                  {{ group.aiCount }}
                </span>
              </div>
            </div>

            <!-- Desktop -->
            <div
              class="hidden grid-cols-[auto_150px_auto] grid-rows-[auto_auto] items-center gap-x-4 gap-y-1 text-sm sm:grid"
            >
              <!-- Labels -->
              <span class="text-[10px] uppercase tracking-wide text-ui-muted">
                Human
              </span>

              <div />

              <span
                class="text-right text-[10px] uppercase tracking-wide text-ui-muted"
              >
                AI
              </span>

              <!-- Values + mini chart -->
              <span class="tabular-nums">
                {{ group.humanCount }}
              </span>

              <div
                class="flex h-2 w-[150px] overflow-hidden rounded-full border border-ui-bg"
              >
                <div
                  v-if="group.humanCount"
                  class="h-full bg-ui-organic"
                  :class="{ 'border-r-2 border-ui-bg': group.aiCount }"
                  :style="{
                    flexGrow: group.humanCount,
                  }"
                />

                <div
                  v-if="group.aiCount"
                  class="h-full bg-ui-automation"
                  :style="{
                    flexGrow: group.aiCount,
                  }"
                />
              </div>

              <span class="text-right tabular-nums">
                {{ group.aiCount }}
              </span>
            </div>
          </div>
        </summary>

        <div class="border-t border-ui-border">
          <!-- Mobile -->
          <div class="divide-y divide-ui-border md:hidden">
            <div
              v-for="item in getSortedItems(group.repoName, group.items)"
              :key="`${group.repoName}-${item.pr}-mobile`"
              class="p-4"
            >
              <div class="mb-3 flex items-center justify-between gap-4">
                <a
                  v-if="item.pr"
                  :href="getPrUrl(group.repoName, item.pr)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 font-medium hover:underline"
                >
                  #{{ item.pr }}

                  <span class="i-lucide:external-link size-3 text-ui-muted" />
                </a>

                <span v-else class="font-medium"> — </span>

                <div class="flex items-center gap-2">
                  <span
                    class="size-2 shrink-0"
                    :class="
                      item.text_verdict === 'ai'
                        ? 'bg-red-500'
                        : 'rounded-full bg-green-500'
                    "
                  />

                  <span class="capitalize">
                    {{ item.text_verdict }}
                  </span>
                </div>
              </div>

              <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt class="text-ui-muted">Score</dt>

                <dd class="text-right tabular-nums">
                  {{ item.score ?? '—' }}
                </dd>

                <dt class="text-ui-muted">Classification</dt>

                <dd class="text-right capitalize">
                  {{ getScoreClassification(item.score ?? 0) }}
                </dd>

                <dt class="text-ui-muted">AI probability</dt>

                <dd class="text-right tabular-nums">
                  {{ formatPercentage(item.text_probability) }}
                </dd>

                <dt class="text-ui-muted">Confidence</dt>

                <dd class="text-right tabular-nums">
                  {{ formatPercentage(item.text_confidence) }}
                </dd>

                <dt class="text-ui-muted">Status</dt>

                <dd class="text-right capitalize">
                  {{ item.pr_status ?? '—' }}
                </dd>
              </dl>
            </div>
          </div>

          <!-- Desktop -->
          <table class="hidden w-full table-fixed text-sm md:table">
            <thead>
              <tr class="border-b border-ui-border text-left text-ui-muted">
                <th class="w-[13%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'pr')"
                  >
                    PR

                    <span
                      v-if="isSortedBy(group.repoName, 'pr')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>

                <th class="w-[10%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'score')"
                  >
                    Score

                    <span
                      v-if="isSortedBy(group.repoName, 'score')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>

                <th class="w-[18%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'classification')"
                  >
                    Classification

                    <span
                      v-if="isSortedBy(group.repoName, 'classification')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>

                <th class="w-[14%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'verdict')"
                  >
                    Verdict

                    <span
                      v-if="isSortedBy(group.repoName, 'verdict')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>

                <th class="w-[18%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center justify-end gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'probability')"
                  >
                    AI probability

                    <span
                      v-if="isSortedBy(group.repoName, 'probability')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>

                <th class="w-[17%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center justify-end gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'confidence')"
                  >
                    Confidence

                    <span
                      v-if="isSortedBy(group.repoName, 'confidence')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>

                <th class="w-[10%] px-3 py-2 font-medium">
                  <button
                    class="flex w-full items-center gap-1 hover:text-ui-text"
                    @click="toggleSort(group.repoName, 'status')"
                  >
                    Status

                    <span
                      v-if="isSortedBy(group.repoName, 'status')"
                      :class="
                        getSortDirection(group.repoName) === 'asc'
                          ? 'i-lucide:chevron-up'
                          : 'i-lucide:chevron-down'
                      "
                      class="size-3 shrink-0"
                    />

                    <span
                      v-else
                      class="i-lucide:chevrons-up-down size-3 shrink-0 opacity-40"
                    />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="item in getSortedItems(group.repoName, group.items)"
                :key="`${group.repoName}-${item.pr}`"
                class="border-b border-ui-border last:border-b-0 hover:bg-ui-card"
              >
                <td class="px-3 py-3">
                  <a
                    v-if="item.pr"
                    :href="getPrUrl(group.repoName, item.pr)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 hover:underline"
                  >
                    #{{ item.pr }}

                    <span
                      class="i-lucide:external-link size-3 shrink-0 text-ui-muted"
                    />
                  </a>

                  <span v-else> — </span>
                </td>

                <td class="px-3 py-3 tabular-nums">
                  {{ item.score ?? '—' }}
                </td>

                <td class="px-3 py-3">
                  <span class="capitalize">
                    {{ getScoreClassification(item.score ?? 0) }}
                  </span>
                </td>

                <td class="px-3 py-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="size-2 shrink-0"
                      :class="
                        item.text_verdict === 'ai'
                          ? 'bg-red-500'
                          : 'rounded-full bg-green-500'
                      "
                    />

                    <span class="capitalize">
                      {{ item.text_verdict }}
                    </span>
                  </div>
                </td>

                <td class="px-3 py-3 text-right tabular-nums">
                  {{ formatPercentage(item.text_probability) }}
                </td>

                <td class="px-3 py-3 text-right tabular-nums">
                  {{ formatPercentage(item.text_confidence) }}
                </td>

                <td class="px-3 py-3">
                  <span class="capitalize">
                    {{ item.pr_status ?? '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>

    <div v-else class="py-12 text-center text-sm text-ui-muted">
      No repositories with at least {{ MIN_PRS_PER_REPO }} PRs in the last
      24-hour window.
    </div>
  </div>
</template>
