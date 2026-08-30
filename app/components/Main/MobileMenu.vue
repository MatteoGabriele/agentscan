<script setup lang="ts">
const route = useRoute()
const { trackEvent } = useSaEvent()

const isMenuOpen = ref<boolean>(false)
function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

watch(isMenuOpen, (value) => {
  if (value) {
    window.document.body.classList.add('overflow-hidden')
  } else {
    window.document.body.classList.remove('overflow-hidden')
  }
})

watch(
  () => route.path,
  () => {
    isMenuOpen.value = false
  },
)

onBeforeUnmount(() => {
  window.document.body.classList.remove('overflow-hidden')
})
</script>

<template>
  <div
    :class="{
      'fixed flex flex-col inset-0 h-dvh bg-ui-bg z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]':
        isMenuOpen,
    }"
  >
    <div class="flex justify-end shrink-0">
      <button class="flex self-end" @click="toggleMenu">
        <span v-if="isMenuOpen" class="i-lucide:x"></span>
        <span v-else class="i-lucide:menu"></span>
      </button>
    </div>

    <div
      v-if="isMenuOpen"
      class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
    >
      <div
        class="flex items-center flex-col gap-6 justify-center min-h-full py-6"
      >
        <div class="flex flex-col items-center gap-3">
          <p
            class="text-xs uppercase tracking-wider text-ui-muted/70 font-semibold"
          >
            Scan
          </p>
          <ul class="flex flex-col items-center gap-3">
            <li>
              <LazyMainMenuItem class="text-xl" to="/" label="Account search" />
            </li>
            <li>
              <LazyMainMenuItem
                class="text-xl"
                to="/scan"
                label="Repository scan"
              />
            </li>
            <li>
              <LazyMainMenuItem class="text-xl" to="/lab" label="The Lab" />
            </li>
          </ul>
        </div>

        <div class="w-1/2 border-b h-px border-ui-border-subtle/80"></div>

        <LazyMainMenuItem
          class="text-xl"
          to="/activity"
          label="Activity Breakdown"
        />

        <div class="w-1/2 border-b h-px border-ui-border-subtle/80"></div>

        <div class="flex flex-col items-center gap-3">
          <p
            class="text-xs uppercase tracking-wider text-ui-muted/70 font-semibold"
          >
            Community
          </p>
          <ul class="flex flex-col items-center gap-3">
            <li>
              <LazyMainMenuItem
                class="text-xl"
                to="/automations"
                label="Community reports"
              />
            </li>
            <li>
              <LazyMainMenuItem
                class="text-xl"
                to="/adopters"
                label="Used by"
              />
            </li>
          </ul>
        </div>

        <div class="w-1/2 border-b h-px border-ui-border-subtle/80"></div>

        <LazyMainMenuItem
          class="text-xl"
          to="/app"
          label="Install AgentScan"
          @click="trackEvent('get_agentscan_clicked')"
        />

        <LazyCommunityStrip class="mt-4 max-w-2/3" />
      </div>
    </div>
  </div>
</template>
