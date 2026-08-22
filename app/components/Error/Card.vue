<script setup lang="ts">
import type { ErrorTone } from '~/composables/useErrorDetails'

const props = withDefaults(
  defineProps<{
    icon: string
    title: string
    description: string
    tone?: ErrorTone
    hint?: string
    statusCode?: number
    detail?: string
    retryLabel?: string
    retry?: (() => unknown) | null
  }>(),
  {
    tone: 'neutral',
    hint: undefined,
    statusCode: undefined,
    detail: undefined,
    retryLabel: 'Try again',
    retry: null,
  },
)

const tones = {
  neutral: {
    ring: 'border-ui-border',
    halo: 'bg-ui-muted/10',
    text: 'text-ui-muted',
  },
  notice: {
    ring: 'border-ui-mixed/40',
    halo: 'bg-ui-mixed/10',
    text: 'text-ui-mixed',
  },
  critical: {
    ring: 'border-ui-automation/40',
    halo: 'bg-ui-automation/10',
    text: 'text-ui-automation',
  },
  positive: {
    ring: 'border-ui-organic/40',
    halo: 'bg-ui-organic/10',
    text: 'text-ui-organic',
  },
} as const

const toneStyle = computed(() => tones[props.tone])

const showDetail = computed<boolean>(() => {
  if (!props.detail) {
    return false
  }

  return props.detail.toLowerCase() !== props.description.toLowerCase()
})

const isRetrying = ref(false)
const { trackEvent } = useSaEvent()

async function handleRetry() {
  if (!props.retry || isRetrying.value) {
    return
  }

  trackEvent('error_card_retry_clicked', {
    statusCode: props.statusCode ?? 0,
  })

  isRetrying.value = true

  try {
    await props.retry()
  } finally {
    isRetrying.value = false
  }
}
</script>

<template>
  <div
    class="bg-ui-bg rounded-2 border-2 border-solid border-ui-border/40"
    role="status"
  >
    <div
      class="flex flex-col items-center text-center px-6 pt-10 pb-8 @md:px-10 @md:pt-14 @md:pb-10"
    >
      <span
        class="flex items-center justify-center size-14 rounded-full border-1 border-solid"
        :class="[toneStyle.ring, toneStyle.halo]"
      >
        <span
          :class="[icon, toneStyle.text]"
          class="text-xl"
          aria-hidden="true"
        />
      </span>

      <h3 class="mt-5 text-xl font-mono text-ui-text text-balance">
        {{ title }}
      </h3>

      <p class="mt-2 max-w-md text-sm text-ui-muted text-pretty">
        {{ description }}
      </p>

      <p v-if="hint" class="mt-2 max-w-md text-xs text-ui-muted/70 text-pretty">
        {{ hint }}
      </p>

      <slot />

      <div
        v-if="retry || $slots.actions"
        class="mt-6 flex flex-wrap items-center justify-center gap-2"
      >
        <button
          v-if="retry"
          type="button"
          class="pill-action disabled:opacity-60"
          :disabled="isRetrying"
          @click="handleRetry"
        >
          <span
            class="i-lucide:refresh-cw text-xs"
            :class="{ 'animate-spin': isRetrying }"
            aria-hidden="true"
          />
          {{ isRetrying ? 'Retrying' : retryLabel }}
        </button>

        <slot name="actions" />
      </div>

      <p
        v-if="showDetail"
        class="mt-6 pt-4 w-full border-t-1 border-solid border-ui-border-subtle/40 text-xs font-mono text-ui-muted/60 text-pretty"
      >
        <span v-if="statusCode">{{ statusCode }} · </span>
        <span>{{ detail }}</span>
      </p>
    </div>
  </div>
</template>
