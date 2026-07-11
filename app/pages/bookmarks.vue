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
    <ul class="flex flex-col gap-4 w-full">
      <li
        v-for="item in 3"
        :key="item"
        class="not-last:border-b border-gh-border-light pb-6 mb-2"
      >
        <div class="flex items-center gap-4 animate-pulse">
          <div class="size-12 rounded-full bg-gh-border shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gh-border rounded w-1/3" />
            <div class="h-3 bg-gh-border rounded w-1/4" />
          </div>
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
    <ul class="flex flex-col gap-4">
      <li
        v-for="account in bookmarkedAccounts"
        :key="account.login"
        class="not-last:border-b border-gh-border-light pb-6 mb-2 flex items-center gap-4"
      >
        <div
          v-if="account.avatarUrl"
          class="size-12 rounded-full overflow-hidden bg-gh-card shrink-0"
        >
          <img :src="account.avatarUrl" :alt="`Avatar of ${account.login}`" />
        </div>

        <div class="flex-1 min-w-0">
          <NuxtLink
            :to="`/user/${account.login}`"
            class="text-lg font-mono hover:text-gh-muted"
          >
            {{ account.name || account.login }}
          </NuxtLink>
          <p class="text-gh-muted text-sm">@{{ account.login }}</p>
        </div>

        <p class="text-gh-muted text-xs hidden @md:block shrink-0">
          Bookmarked <NuxtTime :datetime="account.bookmarkedAt" />
        </p>

        <button
          type="button"
          class="shrink-0 size-9 flex items-center justify-center rounded-full hover:bg-gh-danger-hover/10 text-gh-muted transition-colors hover:text-gh-danger hover:border-gh-danger/40"
          :aria-label="`Remove ${account.login} from bookmarks`"
          @click="removeBookmark(account.login)"
        >
          <span class="i-lucide:trash-2" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>
