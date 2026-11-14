<script setup lang="ts">
const props = defineProps<{
  items: IntegrationItem[]
}>()

const isDisclosureOpen = ref<boolean>(false)
const counter = computed<number>(() => {
  return props.items.length
})
</script>

<template>
  <section>
    <CommonDisclosureRow
      v-model:open="isDisclosureOpen"
      :summary-class="[
        'flex-1 items-center gap-3 bg-ui-mixed/10 text-ui-mixed rounded-lg border-ui-mixed/40 border px-3 py-2 transition-colors',
        isDisclosureOpen
          ? 'border-b-none rounded-b-none'
          : 'hover:border-ui-mixed',
      ]"
      chevron-class="text-base"
      panel-class="bg-ui-mixed/5 border border-t-ui-mixed/30 rounded-b-md border-ui-mixed/40"
    >
      <template #summary>
        <h3 class="flex flex-1 items-center gap-2 text-sm">
          <span class="i-lucide:file-text" aria-hidden="true" />
          <span>Listed in an external report</span>
        </h3>
        <span
          class="bg-ui-mixed/20 text-ui-mixed text-xs font-semibold px-2 py-1 rounded"
        >
          {{ counter }}
        </span>
      </template>

      <ul class="p-4 space-y-4">
        <li
          v-for="item in items"
          :key="`${item.username}-${item.link}`"
          class="p-3 space-y-2"
        >
          <h4 class="text-ui-text/90 text-sm">{{ item.label }}</h4>
          <p class="text-ui-text/70 text-sm">
            {{ item.reason }}
          </p>
          <NuxtLink
            external
            :to="item.link"
            class="inline-block text-ui-text/80 underline text-xs font-semibold hover:text-ui-text"
            target="_blank"
          >
            View source
          </NuxtLink>
        </li>
      </ul>
    </CommonDisclosureRow>
  </section>
</template>
