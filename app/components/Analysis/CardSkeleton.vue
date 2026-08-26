<script setup lang="ts"></script>

<template>
  <div class="animate-pulse">
    <div class="mb-4 flex items-center gap-2">
      <Skeleton width="w-4" height="h-4" rounded="full" />
      <Skeleton width="w-1/3" height="h-6" />
    </div>

    <div class="space-y-3">
      <Skeleton width="w-5/6" />
      <Skeleton width="w-4/6" />
    </div>

    <div class="mt-4 pt-4 border-t border-ui-border-subtle space-y-3">
      <Skeleton width="w-2/5" height="h-3" />
      <Skeleton width="w-24" height="h-3" />
    </div>
  </div>
</template>
