<script setup lang="ts">
const disclosureRows = [
  { title: 'w-1/2', subtitle: 'w-2/3' },
  { title: 'w-1/3', subtitle: 'w-3/5' },
]
</script>

<template>
  <div class="animate-pulse" aria-hidden="true">
    <div class="mb-2 flex h-7 items-center gap-2">
      <Skeleton width="w-4" height="h-4" rounded="full" />
      <Skeleton width="w-1/3" height="h-5" />
    </div>

    <div class="mt-1">
      <div class="flex h-6 items-center">
        <Skeleton width="w-5/6" />
      </div>
      <div class="flex h-6 items-center">
        <Skeleton width="w-4/6" />
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-2">
      <div
        v-for="(row, index) in disclosureRows"
        :key="index"
        class="flex items-center gap-3 rounded-lg border-1 border-solid border-ui-border/50 px-4 py-3"
      >
        <Skeleton
          width="w-6"
          height="h-6"
          rounded="full"
          class="hidden sm:block shrink-0"
        />
        <div class="min-w-0 flex-1">
          <div class="flex h-5 items-center">
            <Skeleton :width="row.title" height="h-3.5" />
          </div>
          <div class="flex h-4 items-center">
            <Skeleton :width="row.subtitle" height="h-3" />
          </div>
        </div>
        <Skeleton width="w-4" height="h-4" class="shrink-0" />
      </div>
    </div>

    <div class="mt-3 flex h-5 items-center">
      <Skeleton width="w-2/5" height="h-3.5" />
    </div>

    <div class="mt-4 pt-4 border-t border-ui-border-subtle">
      <div class="flex h-5 items-center">
        <Skeleton width="w-1/2" height="h-3.5" />
      </div>
      <div class="flex h-4 items-center">
        <Skeleton width="w-20" height="h-3" />
      </div>
    </div>
  </div>
</template>
