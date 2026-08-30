<script setup lang="ts">
import type { GitHubUser } from '@unveil/identity'

defineProps<{
  user: GitHubUser
}>()
</script>

<template>
  <div class="flex @lg:items-center gap-4 @lg:gap-6">
    <div
      v-if="user.avatar_url"
      class="size-12 @lg:size-20 rounded-full overflow-hidden bg-ui-card shrink-0"
    >
      <img :src="`${user.avatar_url}&s=160`" :alt="`Avatar of ${user.login}`" />
    </div>

    <div class="w-full flex flex-col">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-ui-text text-xl font-mono">
          {{ user.name || user.login }}
        </h2>
        <Tooltip label="Bookmark">
          <UserBookmarkButton :user />
        </Tooltip>
      </div>
      <NuxtLink
        :external="true"
        target="_blank"
        :to="`https://github.com/${user.login}`"
        class="text-ui-muted underline text-sm"
      >
        @{{ user.login }}
      </NuxtLink>
      <p v-if="user.bio" class="my-2 text-sm @md:text-base">
        {{ user.bio }}
      </p>
      <ul
        class="text-ui-muted @md:mt-4 text-sm hidden @xl:flex flex-wrap gap-4 flex-row"
      >
        <li class="flex items-center gap-1">
          <span
            class="i-lucide:users hidden @md:flex shrink-0"
            aria-hidden="true"
          />
          {{ user.followers }} followers
        </li>
        <li class="flex items-center gap-1">
          <span
            class="i-lucide:package hidden @md:flex shrink-0"
            aria-hidden="true"
          />
          <span v-if="user.public_repos === 0">No repos</span>
          <span v-else>{{ user.public_repos }} repos</span>
        </li>
        <li class="flex items-center gap-1">
          <span
            class="i-lucide:calendar hidden @md:flex shrink-0"
            aria-hidden="true"
          />
          Since
          <NuxtTime :datetime="user.created_at" date-style="medium" />
        </li>
      </ul>
    </div>
  </div>
</template>
