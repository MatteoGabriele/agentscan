<script setup lang="ts"></script>

<template>
  <div class="flex flex-col gap-6">
    <div
      class="flex h-[140px] gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border flex-col @lg:flex-row animate-pulse"
    >
      <div class="w-full">
        <div class="mb-4">
          <Skeleton width="w-1/3" height="h-6" />
        </div>
        <div class="space-y-4">
          <Skeleton width="w-5/6" />
          <Skeleton width="w-4/6" />
        </div>
      </div>
    </div>
  </div>
</template>
