<script setup lang="ts">
const maxVisibleRepositories = 9

const { data: contributors, status: contributorsStatus } =
  await useContributorsList()
const { data: adopters, status: adoptersStatus } = await useAdopters()

const people = computed<AvatarStackItem[]>(() => contributors.value ?? [])

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
      :items="people"
      :pending="contributorsStatus === 'pending'"
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
        :max="maxVisibleRepositories"
        more-url="/adopters"
      />
    </template>
  </div>
</template>
