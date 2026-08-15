<script setup lang="ts">
import { usePreferredDark } from '@vueuse/core'
import { ref, computed } from 'vue'
import { VueUiRadar, type VueUiRadarDataset } from 'vue-data-ui/vue-ui-radar'

// TODO: props, when the component is plugged to the main search
// props: username, flags & classification should be enough

import('vue-data-ui/style.css')

const rootEl = shallowRef<HTMLElement | null>(null)

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)
const darkMode = usePreferredDark()

// TODO: abstract outside of the component
const GROUPS = {
  ['pr-outcome']: { max: 80, name: 'PR outcome' },
  fork: {
    max: 100,
    name: 'Fork',
  },
  ['pr-volume']: { max: 75, name: 'PR volume' },
  ['branch-pr']: { max: 49, name: 'Branch PR' },
  ['external-focus']: { max: 60, name: 'External focus' },
  ['repo-creation']: { max: 35, name: 'Repo creation' },
  watch: { max: 35, name: 'Watch' },
  ['comment-pr-timing']: {
    max: 30,
    name: 'Comment PR timing',
  },
  timing: { max: 56, name: 'Timing' },
  diversity: { max: 20, name: 'Diversity' },
  engagement: { max: 25, name: 'Engagement' },
  ['repo-spread']: { max: 30, name: 'Repo spread' },
  ['comment-volume']: { max: 40, name: 'Comment vol.' },
  ['pr-comment-volume']: { max: 38, name: 'PR comment vol.' },
  ['account-age']: { max: 30, name: 'Account age' },
  bounty: { max: 25, name: 'Bounty' },
}

const accountName = ref('')
const username = ref('')
const flags = ref<Flag[]>([])
const classification = ref('')

type Flag = {
  group: string
  points: number
  label: string
  detail: string
}

// TODO: to be removed when the component is plugged to the main search
async function handleSubmit(name: string) {
  const user = await $fetch(`/api/account/${name}`)
  username.value = user?.login ?? ''
  if (!username.value) {
    flags.value = []
    return
  }
  const userData = await $fetch(`/api/identify-replicant/${username.value}`, {
    query: {
      show_events: true,
    },
  })
  classification.value = userData?.analysis?.classification ?? ''
  flags.value = userData?.analysis?.flags ?? []
}

const userColor = computed(
  () =>
    colors.value[classification.value as keyof typeof colors.value] ??
    colors.value.border,
)

function createRadarDataset(
  username: string,
  flags: Flag[],
): VueUiRadarDataset {
  return {
    categories: [
      {
        name: username,
        color: userColor.value,
      },
    ],
    series: Object.entries(GROUPS)
      .map(([group, { max, name }]) => {
        const flag = flags.find((flag) => flag.group === group)

        return {
          name,
          values: [flag?.points ?? 0],
          target: max,
          description: flag?.label,
          detail: flag?.detail,
        }
      })
      .sort(
        (a, b) =>
          (b.values?.[0] ?? 0) / b.target - (a.values?.[0] ?? 0) / a.target,
      ),
  }
}

const dataset = computed(() => createRadarDataset(username.value, flags.value))

const config = computed(() => ({
  userOptions: { show: false },
  style: {
    chart: {
      backgroundColor: colors.value.bg,
      layout: {
        scaleToAxisMax: true, // avoid overflow if points > max
        grid: {
          rotation: -90,
          stroke: colors.value.border,
          strokeWidth: 0.3,
          graduations: 3,
        },
        labels: {
          dataLabels: {
            fontSize: 10,
            color: darkMode.value
              ? colors.value.textFaint
              : colors.value.textMuted,
            offset: 0,
          },
        },
        dataPolygon: {
          useGradient: false,
        },
        outerPolygon: {
          stroke: colors.value.border,
          strokeWidth: 0.3,
        },
      },
      legend: {
        show: false,
      },
      tooltip: {
        backgroundColor: colors.value.bg,
        color: colors.value.text,
        borderColor: colors.value.border,
        backgroundOpacity: 70,
      },
    },
  },
}))
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- TODO: to be removed when the component is plugged to the main search -->
    <AnalysisForm v-model="accountName" autofocus @submit="handleSubmit" />
  </div>

  <div>
    <ClientOnly>
      <VueUiRadar :dataset="dataset" :config>
        <template #tooltip="{ datapoint }">
          <div class="text-center tabular-nums">
            <div>{{ datapoint.name }}</div>
            <div class="text-[--text-muted] text-xs max-w-[200px] my-2">
              {{ datapoint.description }}
            </div>
            <div class="flex flex-row items-baseline gap-1 justify-center">
              <span :style="{ color: userColor }" class="text-2xl">
                {{ datapoint.values[0] }}
              </span>
              <span class="text-[--text-muted]">/</span>
              <span class="text-[--text-muted]">
                {{ datapoint.target }}
              </span>
            </div>
            <div
              v-if="datapoint.detail"
              class="text-[--text-muted] text-xs max-w-[200px] text-left py-2 mt-2 border-t border-[--text-faint]"
            >
              {{ datapoint.detail }}
            </div>
          </div>
        </template>
      </VueUiRadar>
    </ClientOnly>
  </div>
</template>
