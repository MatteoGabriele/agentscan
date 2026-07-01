<script setup lang="ts">
import type { GitHubUser, IdentifyResult } from '@unveil/identity'

const props = defineProps<{
  user: GitHubUser
  prUrl: string
  analysis: IdentifyResult
}>()

const prLabel = computed<string>(() => {
  const seg = props.prUrl.split('/')
  const prNumber = seg[seg.length - 1] ?? ''

  return `#${prNumber}`
})

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

const classificationIcon = computed(() => {
  if (classification.value === 'organic') {
    return 'i-lucide:heart-handshake'
  }
  if (classification.value === 'mixed') {
    return 'i-lucide:blend'
  }
  return 'i-lucide:shield-alert'
})

const { scoreStyle } = useScoreStyle(
  classification,
  computed(() => ({ hasCommunityFlag: hasCommunityFlag.value })),
)
</script>

<template>
  <li class="p-4 rounded-lg bg-gh-card border border-gh-border/50">
    <div class="flex items-center gap-4">
      <div
        v-if="user.avatar_url"
        class="size-12 rounded-full overflow-hidden bg-gh-card shrink-0"
      >
        <img :src="user.avatar_url" :alt="`Avatar of ${user.login}`" />
      </div>

      <div class="w-full min-w-0">
        <h3 class="text-gh-text text-lg font-mono line-height-none truncate">
          {{ user.name || user.login }}
        </h3>
        <NuxtLink
          :external="true"
          target="_blank"
          :to="`https://github.com/${user.login}`"
          class="text-gh-muted underline text-sm inline-flex"
        >
          @{{ user.login }}
        </NuxtLink>
      </div>

      <span class="flex items-center gap-1.5 shrink-0" :class="scoreStyle.text">
        <span :class="classificationIcon" class="text-base shrink-0" />
        <p class="text-sm font-mono line-height-none">
          {{ classificationLabel }}
        </p>
      </span>
    </div>

    <div class="pt-4 flex gap-4 items-center justify-between">
      <div class="text-sm flex items-center gap-1">
        <span class="text-gh-muted">Opened PR</span>
        <NuxtLink
          class="text-gh-text/80 underline hover:text-gh-text"
          target="_blank"
          :to="prUrl"
          external
        >
          {{ prLabel }}
        </NuxtLink>
      </div>

      <NuxtLink
        class="text-xs text-gh-text/80 hover:text-gh-text flex items-center gap-1"
        target="_blank"
        :to="`/user/${user.login}`"
      >
        Full analysis
        <span class="i-lucide:arrow-right text-xs" />
      </NuxtLink>
    </div>
  </li>
</template>
