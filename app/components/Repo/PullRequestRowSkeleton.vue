<template>
  <li
    class="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3"
  >
    <Skeleton class="shrink-0" width="size-9" height="size-9" rounded="full" />

    <div class="flex flex-col gap-1.5 min-w-0">
      <Skeleton width="w-2/5" height="h-4" />
      <Skeleton width="w-1/4" height="h-3" />
    </div>

    <Skeleton
      class="col-start-2 sm:col-start-auto"
      width="w-24"
      height="h-4"
      rounded="full"
    />
  </li>
</template>
