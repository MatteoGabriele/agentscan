<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  hint?: string
}>()

const id = useId()
</script>

<template>
  <section
    class="flex flex-col gap-6 rounded-2 border border-ui-border-subtle/40 bg-ui-card p-5 sm:p-6"
    :aria-labelledby="id"
  >
    <header>
      <h3
        :id
        class="flex items-center gap-2 text-base font-semibold text-ui-text"
      >
        <span :class="icon" class="text-ui-muted" aria-hidden="true" />
        {{ title }}
      </h3>
      <p v-if="hint" class="mt-1 text-sm text-ui-muted text-pretty">
        {{ hint }}
      </p>
    </header>

    <slot />
  </section>
</template>
