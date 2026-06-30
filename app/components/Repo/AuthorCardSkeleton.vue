<script setup lang="ts"></script>

<template>
  <li class="p-4 rounded-lg bg-gh-card border border-gh-border/50 animate-pulse">
    <div class="flex items-center gap-4">
      <Skeleton width="size-12" height="size-12" rounded="full" />

      <div class="w-full min-w-0 space-y-2">
        <Skeleton width="w-1/3" height="h-5" />
        <Skeleton width="w-1/4" height="h-4" />
      </div>

      <Skeleton width="w-20" height="h-4" rounded="full" />
    </div>

    <div class="pt-4 flex gap-4 items-center justify-between">
      <Skeleton width="w-24" height="h-4" />
    </div>
  </li>
</template>
