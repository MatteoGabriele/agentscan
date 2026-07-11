<script setup lang="ts">
const { bookmarkedAccounts, isLoaded, removeBookmark } = useBookmarkedAccounts()

useHead({
  title: 'Bookmarks | AgentScan',
  meta: [
    { property: 'og:title', content: 'Bookmarks | AgentScan' },
    {
      property: 'og:description',
      content: 'Accounts you bookmarked, saved locally in this browser',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Bookmarks</h1>
    <p class="text-gh-muted mt-2">
      Accounts you bookmarked, saved locally in this browser.
    </p>
  </header>

  <div v-if="!isLoaded" class="mt-12">
    <ul class="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4 w-full">
      <li
        v-for="item in 3"
        :key="item"
        class="col-span-full grid grid-cols-subgrid items-center not-last:border-b border-gh-border-light py-3"
      >
        <div class="size-12 rounded-full bg-gh-border shrink-0 animate-pulse" />
        <div class="min-w-0 space-y-2">
          <div class="h-4 bg-gh-border rounded w-1/3 animate-pulse" />
          <div class="h-3 bg-gh-border rounded w-1/4 animate-pulse" />
        </div>
        <div class="flex justify-end w-9 @md:w-44">
          <div
            class="hidden @md:block h-3 w-20 bg-gh-border rounded animate-pulse"
          />
        </div>
      </li>
    </ul>
  </div>

  <div v-else-if="bookmarkedAccounts.length === 0" class="mt-12 text-gh-muted">
    <p>
      No bookmarks yet. Open an account's analysis page and click the bookmark
      icon to save it here.
    </p>
  </div>

  <div v-else class="mt-12">
    <ul class="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4">
      <li
        v-for="account in bookmarkedAccounts"
        :key="account.login"
        class="group col-span-full grid grid-cols-subgrid items-center py-3 px-2 -mx-2 rounded-lg motion-safe:transition-colors hover:bg-gh-border-light/10"
      >
        <div class="size-12 rounded-full overflow-hidden bg-gh-card shrink-0">
          <img
            v-if="account.avatarUrl"
            :src="account.avatarUrl"
            :alt="`Avatar of ${account.login}`"
          />
        </div>

        <div class="min-w-0">
          <NuxtLink
            :to="`/user/${account.login}`"
            class="inline-flex truncate text-lg font-mono text-gh-text/80 hover:text-gh-text hover:underline"
          >
            {{ account.name || account.login }}
          </NuxtLink>
          <p class="text-gh-muted text-sm truncate">@{{ account.login }}</p>
        </div>

        <div class="flex items-center gap-2 w-9 @md:w-44 shrink-0">
          <p
            class="hidden ml-auto shrink-0 whitespace-nowrap text-xs text-gh-muted @md:block"
          >
            Bookmarked <NuxtTime :datetime="account.bookmarkedAt" />
          </p>

          <button
            type="button"
            class="h-9 @md:w-0 shrink-0 group-hover:w-9 @md:opacity-0 group-hover:opacity-100 overflow-hidden flex items-center justify-center rounded-full text-gh-muted motion-safe:transition-all motion-safe:duration-200 hover:bg-gh-danger-hover/10 hover:text-gh-danger"
            :aria-label="`Remove ${account.login} from bookmarks`"
            @click="removeBookmark(account.login)"
          >
            <span class="i-lucide:trash-2 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
