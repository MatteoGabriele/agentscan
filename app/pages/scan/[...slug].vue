<script setup lang="ts">
const route = useRoute()
const repo = computed<string>(() => {
  const { slug } = route.params

  if (!slug) {
    return ''
  }

  if (Array.isArray(slug)) {
    return slug.join('/')
  }

  return slug
})

const { data } = await useAsyncData(`scan-${repo.value}`, () => {
  return $fetch(`/api/scan`, {
    query: {
      repo: repo.value,
    },
  })
})
</script>

<template>
  <div v-if="data">
    <div class="flex items-baseline justify-between mb-2 text-sm text-gh-muted">
      <p>
        {{ data.authors.length }} unique PR authors in
        <NuxtLink
          :to="`https://github.com/${data.repo}`"
          external
          target="_blank"
          class="underline hover:text-gh-text"
        >
          {{ data.repo }}
        </NuxtLink>
      </p>
    </div>

    <ul class="mt-8 grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      <RepoAuthorCard
        v-for="author in data.authors"
        :key="author.user.login"
        :user="author.user"
        :analysis="author.analysis"
      />
    </ul>
  </div>
</template>
