<script setup lang="ts">
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

const selectedDate = shallowRef<string | null>(null);
const lastSelectedDate = shallowRef<string | null>(null);
const visibleMonthDate = shallowRef(new Date());

const availableDates = computed(() => {
  return Array.from(
    new Set(
      props.source.map((item) => item.created_at.slice(0, 10)).filter(Boolean),
    ),
  ).sort();
});

const availableDateSet = computed(() => new Set(availableDates.value));
const firstAvailableDate = computed(() => availableDates.value[0] ?? null);

const lastAvailableDate = computed(
  () => availableDates.value[availableDates.value.length - 1] ?? null,
);

function goToFirstAvailableDate() {
  if (!firstAvailableDate.value) return;
  selectedDate.value = firstAvailableDate.value;
  lastSelectedDate.value = firstAvailableDate.value;
  visibleMonthDate.value = parseDate(firstAvailableDate.value);
  emit("select-date", firstAvailableDate.value);
}

function goToLastAvailableDate() {
  if (!lastAvailableDate.value) return;
  selectedDate.value = lastAvailableDate.value;
  lastSelectedDate.value = lastAvailableDate.value;
  visibleMonthDate.value = parseDate(lastAvailableDate.value);
  emit("select-date", lastAvailableDate.value);
}

const visibleMonthLabel = computed(() =>
  new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(visibleMonthDate.value),
);

const visibleMonthDays = computed(() => {
  const year = visibleMonthDate.value.getFullYear();
  const month = visibleMonthDate.value.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const leadingEmptyDays = firstDayOfMonth.getDay();

  const days = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: lastDayOfMonth.getDate() }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month, day);
      const value = formatDate(date);

      return {
        day,
        value,
        isAvailable: availableDateSet.value.has(value),
        isSelected: selectedDate.value === value,
      };
    }),
  ];

  // 42, not for the meme, but 6 weeks * 7 days...
  return [...days, ...Array.from({ length: 42 - days.length }, () => null)];
});

watch(
  availableDates,
  (dates) => {
    if (!dates.length) {
      selectedDate.value = null;
      lastSelectedDate.value = null;
      emit("select-date", null);
      return;
    }

    if (selectedDate.value && !dates.includes(selectedDate.value)) {
      selectedDate.value = null;
      emit("select-date", null);
    }

    if (!selectedDate.value) {
      selectedDate.value = dates.at(-1) ?? null;
      lastSelectedDate.value = selectedDate.value;
      emit("select-date", selectedDate.value);
    }

    if (selectedDate.value) {
      visibleMonthDate.value = parseDate(selectedDate.value);
    }
  },
  { immediate: true },
);

function toggleCumulatedDates() {
  if (selectedDate.value) {
    lastSelectedDate.value = selectedDate.value;
    selectedDate.value = null;
    emit("select-date", null);
    return;
  }

  if (
    !lastSelectedDate.value ||
    !availableDateSet.value.has(lastSelectedDate.value)
  ) {
    return;
  }

  selectedDate.value = lastSelectedDate.value;
  visibleMonthDate.value = parseDate(lastSelectedDate.value);
  emit("select-date", lastSelectedDate.value);
}

function goToPreviousMonth() {
  visibleMonthDate.value = new Date(
    visibleMonthDate.value.getFullYear(),
    visibleMonthDate.value.getMonth() - 1,
    1,
  );
}

function goToNextMonth() {
  visibleMonthDate.value = new Date(
    visibleMonthDate.value.getFullYear(),
    visibleMonthDate.value.getMonth() + 1,
    1,
  );
}

function selectDate(date: string) {
  if (!availableDateSet.value.has(date)) return;
  selectedDate.value = date;
  lastSelectedDate.value = date;
  emit("select-date", date);
}

/**
 *
 *  Below is stuff we could stick into a utils/dates
 *
 */

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}
</script>

<template>
  <div class="flex flex-col gap-2 w-fit mx-auto text-sm">
    <label>
      <slot name="label" />
    </label>

    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Go to previous month"
        @click="goToPreviousMonth"
      >
        <span
          class="i-carbon-chevron-left w-3 h-3 text-gh-text-muted"
          aria-hidden="true"
        />
      </button>
      <strong>{{ visibleMonthLabel }}</strong>
      <button
        type="button"
        aria-label="Go to next month"
        @click="goToNextMonth"
      >
        <span
          class="i-carbon-chevron-right w-3 h-3 text-gh-text-muted"
          aria-hidden="true"
        />
      </button>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <span
        v-for="day in WEEK_DAYS"
        :key="day"
        class="text-center text-xs opacity-60"
      >
        {{ day }}
      </span>

      <template v-for="(date, index) in visibleMonthDays" :key="index">
        <span v-if="!date" class="h-6.5 px-2 py-1 rounded" aria-hidden="true" />

        <button
          v-else
          type="button"
          :disabled="!date.isAvailable"
          class="h-6.5 px-2 rounded border disabled:opacity-25 disabled:cursor-not-allowed relative"
          :class="
            date.isSelected
              ? 'font-bold border-gh-border-light bg-gh-card'
              : 'border-transparent'
          "
          @click="selectDate(date.value)"
        >
          {{ date.day }}
        </button>
      </template>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="!firstAvailableDate"
        class="flex-1 rounded px-3 py-1 text-xs border border-gh-border disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gh-card flex flex-row justify-center items-center gap-1"
        :class="{
          'bg-gh-card text-white border-gh-border-light':
            selectedDate === firstAvailableDate,
        }"
        @click="goToFirstAvailableDate"
      >
        <span
          v-if="selectedDate === firstAvailableDate"
          class="i-carbon-circle-solid w-1.5 h-1.5 text-gh-text-muted"
          aria-hidden="true"
        />
        <span> First entry </span>
      </button>

      <button
        type="button"
        :disabled="!lastAvailableDate"
        class="flex-1 rounded px-3 py-1 text-xs border border-gh-border disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gh-card flex flex-row justify-center items-center gap-1"
        :class="{
          'bg-gh-card text-white border-gh-border-light':
            selectedDate === lastAvailableDate,
        }"
        @click="goToLastAvailableDate"
      >
        <span
          v-if="selectedDate === lastAvailableDate"
          class="i-carbon-circle-solid w-1.5 h-1.5 text-gh-text-muted"
          aria-hidden="true"
        />
        <span> Last entry </span>
      </button>
    </div>

    <button
      type="button"
      class="self-center w-full rounded px-4 py-1.5 text-xs font-semibold border border-gh-border disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gh-card flex flex-row justify-center items-center gap-1"
      :class="{
        'bg-gh-card text-white border-gh-border-light': !selectedDate,
      }"
      :disabled="!selectedDate && !lastSelectedDate"
      @click="toggleCumulatedDates"
    >
      <span
        v-if="!selectedDate"
        class="i-carbon-circle-solid w-1.5 h-1.5 text-gh-text-muted"
        aria-hidden="true"
      />
      <span> All entries cumulated</span>
    </button>
  </div>
</template>
