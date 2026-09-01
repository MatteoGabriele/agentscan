<script setup lang="ts">
import type { AdopterGroup } from '~~/shared/utils/group-adopters'
import { repositoryNameWithoutOwner } from '~~/shared/utils/group-adopters'
import { formatCompactNumber } from '~~/shared/utils/numbers'

const VISIBLE_REPOSITORIES = 10

const props = defineProps<{
  group: AdopterGroup
  forceExpanded?: boolean
}>()

const { trackEvent } = useSaEvent()

const isOpen = ref(false)
const showAllRepositories = ref(false)

const isExpanded = computed<boolean>(() => props.forceExpanded || isOpen.value)

const topRepository = computed(() => props.group.repositories[0])

const otherRepositories = computed(() => props.group.repositories.slice(1))

const visibleRepositories = computed(() => {
  if (showAllRepositories.value) {
    return otherRepositories.value
  }

  return otherRepositories.value.slice(0, VISIBLE_REPOSITORIES)
})

const hiddenRepositoriesCount = computed<number>(() => {
  return otherRepositories.value.length - visibleRepositories.value.length
})
</script>

<template>
  <li v-if="topRepository" class="not-last:border-b border-ui-border-subtle/40">
    <div class="flex items-center gap-3 py-3">
      <NuxtLink
        external
        target="_blank"
        rel="noopener"
        :to="topRepository.url"
        class="group flex items-center gap-3 min-w-0"
        @click="trackEvent('adopter_repository_link_clicked')"
      >
        <img
          :src="group.avatar"
          alt=""
          aria-hidden="true"
          class="size-8 rounded-full shrink-0 bg-ui-card"
        />

        <span
          class="font-mono text-sm truncate group-hover:text-ui-muted transition-colors"
        >
          {{ topRepository.name }}
        </span>
      </NuxtLink>

      <button
        v-if="otherRepositories.length"
        class="shrink-0 inline-flex items-center gap-1 rounded-full border border-ui-border-subtle/60 px-2 py-0.5 text-xs text-ui-muted tabular-nums hover:text-ui-text hover:border-ui-border/80 transition-colors cursor-pointer"
        :aria-expanded="isExpanded"
        :aria-label="`Show the other ${otherRepositories.length} repositories of ${group.owner}`"
        @click="isOpen = !isOpen"
      >
        +{{ otherRepositories.length }} more
        <span
          class="i-lucide:chevron-down text-[0.9em] transition-transform"
          :class="isExpanded && 'rotate-180'"
          aria-hidden="true"
        />
      </button>

      <span
        class="ml-auto shrink-0 inline-flex items-center gap-1 text-xs text-ui-muted tabular-nums"
      >
        <span class="i-lucide:star text-[0.9em]" aria-hidden="true" />
        {{ formatCompactNumber(topRepository.stars) }}
      </span>
    </div>

    <div v-if="otherRepositories.length && isExpanded" class="ml-4 pb-3">
      <ul class="pl-5 border-l border-ui-border-subtle/40 flex flex-col">
        <li v-for="repository in visibleRepositories" :key="repository.name">
          <NuxtLink
            external
            target="_blank"
            rel="noopener"
            :to="repository.url"
            class="group flex items-center gap-3 py-1.5"
            @click="trackEvent('adopter_repository_link_clicked')"
          >
            <span
              class="font-mono text-sm text-ui-muted truncate group-hover:text-ui-text transition-colors"
            >
              {{ repositoryNameWithoutOwner(repository, group.owner) }}
            </span>

            <span
              class="ml-auto shrink-0 inline-flex items-center gap-1 text-xs text-ui-muted tabular-nums"
            >
              <span class="i-lucide:star text-[0.9em]" aria-hidden="true" />
              {{ formatCompactNumber(repository.stars) }}
            </span>
          </NuxtLink>
        </li>
      </ul>

      <button
        v-if="hiddenRepositoriesCount > 0"
        class="ml-5 mt-1.5 text-sm text-ui-muted/70 hover:text-ui-text cursor-pointer"
        @click="showAllRepositories = true"
      >
        Show {{ hiddenRepositoriesCount }} more
      </button>
    </div>
  </li>
</template>
