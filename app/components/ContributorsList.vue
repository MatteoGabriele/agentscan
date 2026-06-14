<script setup lang="ts">
const { data: contributors } = await useContributorsList();
</script>

<template>
  <div class="flex flex-col items-center group">
    <h3 class="text-sm mb-2 text-gh-muted">Built by the community</h3>
    <ul class="flex items-center">
      <li
        v-for="contributor in contributors"
        :key="contributor.name"
        class="-mx-1 transition-all group-hover:mx-0"
      >
        <NuxtLink
          :to="contributor.url"
          target="_blank"
          external
          class="block size-7.5 filter-saturate-0 hover:filter-saturate-100 overflow-hidden rounded-full bg-gh-card"
        >
          <img
            :src="contributor.avatar"
            :alt="contributor.name"
            :title="contributor.name"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
