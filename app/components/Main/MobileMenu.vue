<script setup lang="ts">
const route = useRoute()

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
    @keydown.esc="isMenuOpen = false"
  >
    <div class="flex justify-end shrink-0">
      <button
        type="button"
        class="flex self-end"
        :aria-label="isMenuOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="isMenuOpen"
        :aria-controls="isMenuOpen ? 'mobile-menu' : undefined"
        @click="toggleMenu"
      >
        <span
          :class="isMenuOpen ? 'i-lucide:x' : 'i-lucide:menu'"
          aria-hidden="true"
        />
      </button>
    </div>

    <nav
      v-if="isMenuOpen"
      id="mobile-menu"
      aria-label="Main"
      class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
    >
      <div
        class="flex items-center flex-col gap-6 justify-center min-h-full py-6"
      >
        <template v-for="section in NAV_SECTIONS" :key="section.key">
          <div
            v-if="'items' in section"
            class="flex flex-col items-center gap-3"
          >
            <p
              class="text-xs uppercase tracking-wider text-ui-muted font-semibold"
            >
              {{ section.label }}
            </p>
            <ul class="flex flex-col items-center gap-3">
              <li v-for="item in section.items" :key="item.to">
                <LazyMainMenuItem
                  class="text-xl"
                  :to="item.to"
                  :label="item.label"
                  :badge="item.badge"
                  :exact="item.exact"
                />
              </li>
            </ul>
          </div>
          <LazyMainMenuItem
            v-else
            class="text-xl"
            :to="section.to"
            :label="section.label"
          />

          <div class="w-1/2 border-b h-px border-ui-border-subtle/30"></div>
        </template>

        <LazyMainMenuItem class="text-xl" to="/bookmarks" label="Bookmarks" />
      </div>
    </nav>
  </div>
</template>
