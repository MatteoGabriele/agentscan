<script setup lang="ts">
const maxVisibleItems = 9

const { data: contribution, status: contributorsStatus } =
  await useContributorsList()
const { data: adopters, status: adoptersStatus } = await useAdopters()

const allContributors = computed<AvatarStackItem[]>(() => {
  const items = contribution.value?.contributors ?? []

  return items.map((contributor) => ({
    id: contributor.id,
    name: contributor.name,
    avatar: `${contributor.avatar}&s=50`,
    url: `https://github.com/${contributor.name}`,
    contributions: contributor.contributions,
  }))
})

const projects = computed<AvatarStackItem[]>(() => {
  return (adopters.value ?? []).map((repository) => ({
    name: repository.name,
    avatar: repository.avatar,
    url: repository.url,
    title: `${repository.name} · ${formatCompactNumber(repository.stars)} ★`,
  }))
})

const showProjects = computed<boolean>(() => {
  return adoptersStatus.value === 'pending' || projects.value.length > 0
})
</script>

<template>
  <div class="flex flex-col md:flex-row items-center justify-center gap-6">
    <CommunityAvatarStack
      label="Built by"
      :items="allContributors"
      :pending="contributorsStatus === 'pending'"
      :max="maxVisibleItems"
      more-url="/contribute"
    />

    <template v-if="showProjects">
      <span
        class="hidden md:block md:relative md:top-2 self-stretch w-px bg-ui-border/40"
        aria-hidden="true"
      />

      <CommunityAvatarStack
        label="Used by"
        :items="projects"
        :pending="adoptersStatus === 'pending'"
        :max="maxVisibleItems"
        more-url="/adopters"
      />
    </template>
  </div>
</template>
