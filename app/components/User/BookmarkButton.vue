<script setup lang="ts">
import type { GitHubUser } from '@unveil/identity'

const props = defineProps<{
  user: GitHubUser
}>()

const { isBookmarked, toggleBookmark } = useBookmarkedAccounts()

const bookmarked = computed(() => isBookmarked(props.user.login))
</script>

<template>
  <button
    type="button"
    class="shrink-0 size-9 flex items-center justify-center rounded-full hover:bg-gh-border-light/20 transition-colors"
    :class="
      bookmarked
        ? 'text-gh-text border-gh-text/40'
        : 'text-gh-muted border-gh-border hover:text-gh-text hover:border-gh-text/40'
    "
    :aria-pressed="bookmarked"
    :aria-label="
      bookmarked
        ? `Remove ${user.login} from bookmarks`
        : `Bookmark ${user.login}`
    "
    @click="toggleBookmark(user)"
  >
    <span
      :class="bookmarked ? 'i-lucide:bookmark-check' : 'i-lucide:bookmark'"
      aria-hidden="true"
    />
  </button>
</template>
