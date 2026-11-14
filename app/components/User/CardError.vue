<script setup lang="ts">
const props = defineProps<{
  error?: (Error & { statusCode?: number }) | null
  username?: string
  retry?: (() => unknown) | null
}>()

const { data: verifiedAutomations } = useVerifiedAutomations()

const isFlaggedAccount = computed(() => {
  return verifiedAutomations.value?.some((automation) => {
    return automation.username === props.username
  })
})

const isNotFound = computed<boolean>(() => props.error?.statusCode === 404)

const githubUrl = computed<string>(() => {
  return `https://github.com/${props.username}`
})
</script>

<template>
  <ErrorCard
    v-if="isNotFound && isFlaggedAccount"
    icon="i-lucide:user-x"
    tone="neutral"
    title="Account no longer available"
    description="This account was reported by the community, and GitHub no longer shows it."
    hint="The report stays listed for reference."
  >
    <p
      v-if="username"
      class="mt-4 font-mono text-sm text-ui-muted px-3 py-1 rounded-full bg-ui-muted/10"
    >
      @{{ username }}
    </p>

    <template #actions>
      <NuxtLink to="/automations" class="pill-action">
        <span class="i-lucide:flag text-xs" aria-hidden="true" />
        See reported accounts
      </NuxtLink>
    </template>
  </ErrorCard>

  <ErrorCard
    v-else-if="isNotFound"
    icon="i-lucide:ghost"
    tone="neutral"
    title="No account under that name"
    description="GitHub has no public account with this handle. It may have been renamed, deleted, or simply mistyped."
    hint="Handles are matched exactly, but casing does not matter."
  >
    <p
      v-if="username"
      class="mt-4 font-mono text-sm text-ui-muted px-3 py-1 rounded-full bg-ui-muted/10"
    >
      @{{ username }}
    </p>

    <template #actions>
      <NuxtLink to="/" class="pill-action">
        <span class="i-lucide:search text-xs" aria-hidden="true" />
        Search another account
      </NuxtLink>
      <NuxtLink
        v-if="username"
        :to="githubUrl"
        external
        target="_blank"
        class="pill-action"
      >
        <span class="i-lucide:external-link text-xs" aria-hidden="true" />
        Check on GitHub
      </NuxtLink>
    </template>
  </ErrorCard>

  <ErrorCardGeneric v-else :error :retry />
</template>
