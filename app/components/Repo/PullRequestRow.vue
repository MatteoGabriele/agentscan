<script setup lang="ts">
import type { PullRequestRowData } from '~~/shared/types/scan'

const props = defineProps<PullRequestRowData>()

const authorPath = computed<string>(() => `/user/${props.author.login}`)
</script>

<template>
  <li
    class="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3"
  >
    <img
      v-if="author.avatarUrl"
      :src="author.avatarUrl"
      alt=""
      width="36"
      height="36"
      loading="lazy"
      class="size-9 shrink-0 rounded-full sm:row-span-2"
    />
    <span
      v-else
      class="size-9 shrink-0 rounded-full bg-ui-border/15 sm:row-span-2"
      aria-hidden="true"
    />

    <div class="flex flex-col gap-1.5 min-w-0 sm:row-span-2">
      <p class="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0">
        <NuxtLink
          :to="url"
          external
          target="_blank"
          :aria-label="`Pull request #${number} on GitHub (opens in a new tab)`"
          class="self-start sm:self-auto shrink-0 inline-flex items-center gap-0.5 font-mono tabular-nums text-sm text-ui-text underline underline-offset-4 decoration-ui-border hover:decoration-ui-text"
        >
          #{{ number }}
          <span class="i-lucide:arrow-up-right text-xs" aria-hidden="true" />
        </NuxtLink>
        <span
          v-if="title"
          :title
          class="max-sm:line-clamp-2 sm:truncate text-sm text-ui-text/90"
          >{{ title }}</span
        >
      </p>

      <p
        class="flex flex-wrap gap-x-1.5 text-xs text-ui-muted [&>span:not(:last-child)]:after:content-['·'] [&>span:not(:last-child)]:after:ml-1.5"
      >
        <span class="whitespace-nowrap">
          by
          <NuxtLink
            :to="authorPath"
            :aria-label="`AgentScan analysis of @${author.login}`"
            class="underline hover:text-ui-text"
            >@{{ author.login }}</NuxtLink
          >
        </span>
        <span class="whitespace-nowrap">
          opened <NuxtTime :datetime="createdAt" relative />
        </span>

        <span v-if="state !== 'open'">{{ state }}</span>
      </p>
    </div>

    <div
      class="col-start-2 sm:col-start-auto sm:row-span-2 flex flex-wrap justify-between mt-2 items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end"
    >
      <RepoClassificationTag :classification :community-reported />
      <NuxtLink
        :to="authorPath"
        class="text-xs text-ui-muted underline hover:text-ui-text"
      >
        View analysis<span class="sr-only"> of @{{ author.login }}</span>
      </NuxtLink>
    </div>
  </li>
</template>
