<script setup lang="ts">
defineProps<{
  user: GitHubUser;
}>();
</script>

<template>
  <div
    class="flex @lg:items-center gap-4 @lg:gap-6 bg-gh-card p-4 @md:p-6 rounded-2 border-1 border-solid border-gh-border"
  >
    <div
      v-if="user.avatar_url"
      class="size-12 @lg:size-20 rounded-full overflow-hidden bg-gh-card shrink-0"
    >
      <img :src="user.avatar_url" :alt="`Avatar of ${user.login}`" />
    </div>

    <div class="w-full flex flex-col">
      <h2 class="text-gh-text text-xl font-mono">
        {{ user.name || user.login }}
      </h2>
      <NuxtLink
        :external="true"
        target="_blank"
        :to="`https://github.com/${user.login}`"
        class="text-gh-muted underline text-sm"
      >
        @{{ user.login }}
      </NuxtLink>
      <p v-if="user.bio" class="my-2 text-sm @md:text-base">
        {{ user.bio }}
      </p>
      <ul
        class="text-gh-muted @md:mt-4 text-sm hidden @xl:flex flex-wrap gap-4 flex-row"
      >
        <li class="flex items-center gap-1">
          <span
            class="i-carbon-user-multiple hidden @md:flex shrink-0"
            aria-hidden="true"
          />
          {{ user.followers }} followers
        </li>
        <li class="flex items-center gap-1">
          <span
            class="i-carbon-repo-source-code hidden @md:flex shrink-0"
            aria-hidden="true"
          />
          <span v-if="user.public_repos === 0">No repos</span>
          <span v-else>{{ user.public_repos }} repos</span>
        </li>
        <li class="flex items-center gap-1">
          <span
            class="i-carbon-calendar hidden @md:flex shrink-0"
            aria-hidden="true"
          />
          Since
          <NuxtTime :datetime="user.created_at" date-style="medium" />
        </li>
      </ul>
    </div>
  </div>
</template>
