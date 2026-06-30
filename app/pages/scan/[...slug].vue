<script setup lang="ts">
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'

const route = useRoute()
const router = useRouter()

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

const repoInput = ref(repo.value)

async function handleSubmit(value: string) {
  const slug = parseRepoSlug(value)

  if (!slug) {
    return
  }

  await router.push(`/scan/${slug.path}`)
}
</script>

<template>
  <RepoForm v-model="repoInput" class="mb-8" @submit="handleSubmit" />

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

    <ul class="mt-8 flex flex-col gap-4">
      <RepoAuthorCard
        v-for="author in data.authors"
        :key="author.user.login"
        :user="author.user"
        :pr-url="author.prUrl"
        :analysis="author.analysis"
      />
    </ul>

    <p
      class="mt-8 mx-auto max-w-md text-xs text-gh-muted/60 leading-relaxed text-pretty text-center"
    >
      Results are based on pattern analysis and should be interpreted as possible signals, not
      conclusions. Always verify findings with additional context.
    </p>
  </div>
</template>
