<script setup lang="ts">
defineProps<{
  onlyLogo?: boolean
}>()

const route = useRoute()
const isBookmarksPage = computed<boolean>(() => route.path === '/bookmarks')
</script>

<template>
  <header class="flex justify-between items-center gap-6 px-4 @4xl:px-6 py-4">
    <div class="flex-1">
      <NuxtLink
        class="flex gap-2 items-center text-ui-text"
        to="/"
        aria-label="Homepage"
      >
        <MainLogo size="xs" />
      </NuxtLink>
    </div>
    <div v-if="!onlyLogo" class="hidden @4xl:block">
      <MainNavMenu :sections="NAV_SECTIONS" />
    </div>

    <div v-if="!onlyLogo" class="flex-1 flex items-center gap-3 justify-end">
      <div class="flex items-center gap-1">
        <!-- The mobile menu already lists Bookmarks. -->
        <NuxtLink
          to="/bookmarks"
          aria-label="Bookmarks"
          title="Bookmarks"
          class="hidden @4xl:grid size-8 place-items-center rounded-full transition-colors hover:bg-ui-muted/10 hover:text-ui-text"
          :class="
            isBookmarksPage ? 'bg-ui-muted/10 text-ui-text' : 'text-ui-muted'
          "
        >
          <span class="i-lucide:bookmark" aria-hidden="true"></span>
        </NuxtLink>

        <MainThemeToggle />
      </div>

      <LazyMainMobileMenu hydrate-on-visible class="@4xl:hidden" />
    </div>
  </header>
</template>
