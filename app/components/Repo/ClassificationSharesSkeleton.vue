<script setup lang="ts">
import { NAMED_CATEGORIES } from '~~/shared/utils/classifications'
</script>

<template>
  <!-- Mirrors RepoClassificationShares: one item per named category. -->
  <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-hidden="true">
    <li
      v-for="{ category } in NAMED_CATEGORIES"
      :key="category"
      class="flex items-center gap-2 h-5"
    >
      <Skeleton width="size-2" height="size-2" rounded="full" />
      <Skeleton width="w-20" height="h-3" />
    </li>
  </ul>
</template>
