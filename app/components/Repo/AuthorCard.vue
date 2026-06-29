<script setup lang="ts">
import type { GitHubUser, IdentifyResult } from '@unveil/identity'

const props = defineProps<{
  user: GitHubUser
  analysis: IdentifyResult
}>()

const classification = computed(() => props.analysis.classification)

const { data: verifiedAutomations } = useVerifiedAutomations()

const hasCommunityFlag = computed(() => {
  return !!verifiedAutomations.value?.find((account) => {
    return (
      account.username.toLowerCase() === props.user.login.toLowerCase() ||
      account.id === props.user.id
    )
  })
})

const classificationLabel = computed(() => {
  if (hasCommunityFlag.value) {
    return 'Flagged'
  }
  const value = classification.value
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '-'
})

const { scoreStyle } = useScoreStyle(
  classification,
  computed(() => ({ hasCommunityFlag: hasCommunityFlag.value })),
)
</script>

<template>
  <li>
    <NuxtLink
      :to="`/user/${user.login}`"
      class="flex flex-col items-center gap-4 p-6 rounded-xl bg-gh-card border border-solid border-gh-border-light/30 hover:border-gh-border-light transition-colors group h-full"
    >
      <img
        :src="user.avatar_url"
        :alt="`${user.login} avatar`"
        class="size-14 rounded-full shrink-0"
        loading="lazy"
      />

      <p
        class="font-mono text-sm text-gh-muted group-hover:text-gh-text transition-colors truncate w-full text-center"
      >
        {{ user.login }}
      </p>

      <div
        class="flex flex-col items-center gap-2 mt-auto pt-4 border-t border-gh-border-light/20 w-full text-center"
      >
        <p class="text-[10px] uppercase tracking-widest text-gh-muted/50 font-mono">
          Classification
        </p>
        <p class="text-xs font-mono text-gh-muted">
          {{ classificationLabel }}
        </p>
        <span class="size-1.5 rounded-full shrink-0" :class="scoreStyle.background" />
      </div>
    </NuxtLink>
  </li>
</template>
