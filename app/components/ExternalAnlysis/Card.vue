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
    <button
      :aria-expanded="isDisclosureOpen"
      aria-controls="disclosure-external-analysis"
      class="w-full bg-ui-mixed/10 text-ui-mixed rounded-lg border-ui-mixed/40 border px-3 py-2 text-left transition-colors"
      :class="{
        'border-b-none rounded-b-none': isDisclosureOpen,
        'hover:border-ui-mixed': !isDisclosureOpen,
      }"
      @click="isDisclosureOpen = !isDisclosureOpen"
    >
      <div class="flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm">
          <span class="i-lucide:triangle-alert"></span>
          <span>Suspicious Activity Reported</span>
        </h3>
        <div class="flex items-center gap-3">
          <span
            class="bg-ui-mixed/20 text-ui-mixed text-xs font-semibold px-2 py-1 rounded"
          >
            {{ counter }}
          </span>
          <span
            :class="[
              'i-lucide:chevron-down text-base transition-transform',
              isDisclosureOpen && 'rotate-180',
            ]"
          />
        </div>
      </div>
    </button>

    <ul
      v-if="isDisclosureOpen"
      id="disclosure-external-analysis"
      class="bg-ui-mixed/5 border border-t-ui-mixed/30 rounded-b-md border-ui-mixed/40 p-4 space-y-4"
    >
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
          View Report
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
