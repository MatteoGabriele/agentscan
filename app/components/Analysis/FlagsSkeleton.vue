<script setup lang="ts"></script>

<template>
  <section class="bg-ui-card rounded-2 px-6 py-5">
    <header class="flex items-center gap-2 mt-1">
      <Skeleton width="w-36" height="h-5" />
    </header>

    <ul class="mt-3.5 flex flex-col gap-1">
      <div class="my-3.5 flex flex-col gap-3">
        <Skeleton width="w-1/5" height="h-3" />
        <Skeleton width="w-4/6" height="h-3" />
      </div>
    </ul>
  </section>
</template>
