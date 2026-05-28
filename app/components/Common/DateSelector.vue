<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    source?: EcosystemHealthItem[];
  }>(),
  {
    source: () => [],
  },
);

const emit = defineEmits<{
  "select-date": [date: string | null];
}>();

const ALL_VALUE = "__all__";

const availableDates = computed(() => {
  return Array.from(
    new Set(
      props.source.map((item) => item.created_at.slice(0, 10)).filter(Boolean),
    ),
  ).sort();
});

const selectedDate = ref<string>(ALL_VALUE);

function reset() {
  emit("select-date", null);
}

watch(
  availableDates,
  (dates) => {
    if (
      selectedDate.value !== ALL_VALUE &&
      selectedDate.value &&
      !dates.includes(selectedDate.value)
    ) {
      selectedDate.value = ALL_VALUE;
      reset();
    }
  },
  { immediate: true },
);

function handleDateSelection(event: Event) {
  const target = event.target as HTMLSelectElement;
  selectedDate.value = target.value;
  if (selectedDate.value === ALL_VALUE) {
    reset();
    return;
  }
  emit("select-date", selectedDate.value);
}
</script>

<template>
  <label class="flex flex-col w-fit mx-auto text-sm">
    <slot name="label" />
    <select :value="selectedDate" @change="handleDateSelection">
      <option :value="ALL_VALUE">all</option>
      <option v-for="date in availableDates" :key="date" :value="date">
        {{ date }}
      </option>
    </select>
  </label>
</template>
