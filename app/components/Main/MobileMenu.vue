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
      'fixed flex flex-col inset-0 bg-ui-bg z-40 p-4': isMenuOpen,
    }"
  >
    <div class="flex justify-end">
      <button class="flex self-end" @click="toggleMenu">
        <span v-if="isMenuOpen" class="i-lucide:x"></span>
        <span v-else class="i-lucide:menu"></span>
      </button>
    </div>

    <div
      v-if="isMenuOpen"
      class="flex items-center flex-col gap-8 justify-center h-full"
    >
      <div class="flex flex-col items-center gap-4">
        <p
          class="text-xs uppercase tracking-wider text-ui-muted/70 font-semibold"
        >
          Scan
        </p>
        <ul class="flex flex-col items-center gap-4">
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
            <LazyMainMenuItem
              class="text-xl"
              to="/automations"
              label="Community reports"
            />
          </li>
        </ul>
      </div>

      <div class="w-1/2 border-b h-px border-ui-border-subtle/80"></div>

      <ul class="flex flex-col items-center gap-4">
        <li>
          <LazyMainMenuItem
            class="text-xl"
            to="/health"
            label="Ecosystem health"
          />
        </li>
        <li><LazyMainMenuItem class="text-xl" to="/lab" label="The lab" /></li>
        <li>
          <LazyMainMenuItem class="text-xl" to="/bookmarks" label="Bookmarks" />
        </li>
        <li>
          <LazyMainMenuItem
            class="text-xl"
            to="/app"
            label="Install AgentScan"
            @click="trackEvent('get_agentscan_clicked')"
          />
        </li>
      </ul>

      <LazyCommunityStrip class="my-12" />
    </div>
  </div>
</template>
