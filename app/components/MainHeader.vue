<script setup lang="ts">
const { data } = await useFetch("/api/auth/me");
const user = computed(() => data.value?.user);
</script>

<template>
  <header class="p-4 flex gap-2 items-center justify-between">
    <NuxtLink
      aria-label="Link to Github repository"
      external
      class="hover:text-gh-muted"
      to="https://github.com/MatteoGabriele/agentscan"
    >
      <span
        class="i-carbon:logo-github border size-12 md:size-6 flex"
        aria-hidden="true"
      />
    </NuxtLink>

    <NuxtLink
      :to="{ name: 'account' }"
      class="size-12 md:size-6 rounded-full overflow-hidden"
      v-if="user"
    >
      <img :src="user.avatar" alt="user avatar" />
    </NuxtLink>
  </header>
</template>
