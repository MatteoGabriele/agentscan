<script setup lang="ts">
const route = useRoute();
const isHomePage = computed<boolean>(() => route.name === "index");

const isMenuOpen = ref<boolean>(false);
function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

watch(isMenuOpen, (value) => {
  if (value) {
    window.document.body.classList.add("overflow-hidden");
  } else {
    window.document.body.classList.remove("overflow-hidden");
  }
});

watch(
  () => route.path,
  () => {
    isMenuOpen.value = false;
  },
);

onBeforeUnmount(() => {
  window.document.body.classList.remove("overflow-hidden");
});
</script>

<template>
  <div
    :class="{
      'absolute flex flex-col inset-0 bg-gh-bg z-40 p-4': isMenuOpen,
    }"
  >
    <div class="flex justify-end">
      <button @click="toggleMenu" class="lg:hidden flex self-end">
        <span v-if="isMenuOpen" class="i-lucide:x"></span>
        <span v-else class="i-lucide:menu"></span>
      </button>
    </div>

    <div
      v-if="isMenuOpen"
      class="flex items-center flex-col gap-6 justify-center h-full"
    >
      <ul class="flex flex-col items-center gap-4">
        <li>
          <MainMenuItem class="text-xl" to="/health" label="Ecosystem health" />
        </li>
        <li><MainMenuItem class="text-xl" to="/lab" label="The lab" /></li>
        <li>
          <MainMenuItem
            class="text-xl"
            to="/automations"
            label="Community flags"
          />
        </li>
        <li>
          <MainMenuItem
            class="text-xl"
            to="/detected-automations"
            label="Daily flags"
          />
        </li>
      </ul>

      <div class="w-1/2 border-b h-px border-gh-border-light/80"></div>

      <NuxtLink
        external
        target="_blank"
        to="https://github.com/marketplace/actions/agentscan"
        class="flex items-center px-4 gap-1 py-1 font-medium rounded-full border border-gh-border text-gh-muted hover:text-gh-text hover:border-gh-border/60 transition-colors whitespace-nowrap"
        title="Use it as a GitHub Action"
      >
        <span class="i-lucide:git-fork text-sm"></span>
        <span>AgentScan GitHub action</span>
      </NuxtLink>
    </div>
  </div>
</template>
