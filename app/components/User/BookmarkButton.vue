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
    class="shrink-0 size-9 flex items-center justify-center rounded-full hover:bg-ui-border-subtle/20 transition-colors"
    :class="
      bookmarked
        ? 'text-ui-text border-ui-text/40'
        : 'text-ui-muted border-ui-border hover:text-ui-text hover:border-ui-text/40'
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
