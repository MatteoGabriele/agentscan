<script setup lang="ts">
import type { ActivityCategory } from '~~/shared/types/activity'

const {
  repo = 'nuxt/nuxt',
  // No sample defaults: props are encoded in the image URL, where a null
  // would arrive as the string "null".
  score,
  classification,
  label = 'Organic contributions',
  count = 120,
  days = 30,
} = defineProps<{
  repo?: string
  score?: number
  classification?: ActivityCategory
  label?: string
  count?: number
  days?: number
}>()

// The renderer can't read CSS variables, so these mirror the dark theme
// tokens in app/assets/main.css.
const COLORS = {
  bg: '#0b0b0b',
  card: '#161616',
  border: '#575757',
  text: '#f0f0f0',
  muted: '#808080',
}

const CLASSIFICATION_COLORS: Record<ActivityCategory, string> = {
  organic: '#22c55e',
  mixed: '#e7b416',
  automation: '#f0443a',
}

const accent = computed(() =>
  classification ? CLASSIFICATION_COLORS[classification] : COLORS.border,
)

const owner = computed(() => repo.split('/')[0] ?? '')
const name = computed(() => repo.split('/').slice(1).join('/') || repo)

// Shrinks long repository names to stay on a single line, assuming bold
// glyphs average 0.7em across the ~970px the card leaves for text.
const nameSize = computed(() =>
  Math.max(40, Math.min(104, Math.floor(970 / (name.value.length * 0.7)))),
)
</script>

<template>
  <div
    class="w-full h-full flex p-12"
    :style="{ backgroundColor: COLORS.bg, color: COLORS.text }"
  >
    <div
      class="w-full h-full flex flex-col justify-between rounded-3xl border-solid border-4 px-16 py-14"
      :style="{ backgroundColor: COLORS.card, borderColor: accent }"
    >
      <div
        class="flex items-center justify-between text-3xl"
        :style="{ color: COLORS.muted }"
      >
        <div class="flex items-center gap-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="44"
            height="44"
            viewBox="0 0 32 32"
          >
            <path
              :fill="COLORS.text"
              d="M21 29H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16v2H5v22h16Z"
            />
            <path
              :fill="COLORS.text"
              d="M15 9h2v14h-2zm12 0h2v14h-2zm-6 0h2v14h-2z"
            />
          </svg>
          <span :style="{ color: COLORS.text }">AgentScan</span>
        </div>
        <span>Last {{ days }} days</span>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-4xl" :style="{ color: COLORS.muted }"
          >{{ owner }} /</span
        >
        <span
          class="font-bold leading-none"
          :style="{ fontSize: `${nameSize}px` }"
          >{{ name }}</span
        >
      </div>

      <div class="flex items-end justify-between">
        <div class="flex flex-col gap-3">
          <div
            v-if="classification"
            class="flex items-center gap-4 text-4xl"
            :style="{ color: accent }"
          >
            <div
              class="w-5 h-5 rounded-full"
              :style="{ backgroundColor: accent }"
            />
            <span>{{ label }}</span>
          </div>
          <span class="text-3xl" :style="{ color: COLORS.muted }">
            {{
              count
                ? `${count.toLocaleString('en')} pull requests scored`
                : 'No pull requests scored'
            }}
          </span>
        </div>

        <div v-if="score !== undefined" class="flex flex-col items-end">
          <div class="flex items-baseline">
            <span
              class="font-bold leading-none"
              :style="{ fontSize: '136px', color: accent }"
              >{{ score }}</span
            >
            <span class="text-4xl" :style="{ color: COLORS.muted }">/100</span>
          </div>
          <span class="text-2xl" :style="{ color: COLORS.muted }"
            >Contributor score</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
