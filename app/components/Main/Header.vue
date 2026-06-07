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
</script>

<template>
  <header class="h-12 flex justify-between items-center px-4 md:px-6 py-4">
    <div>
      <NuxtLink
        v-if="!isHomePage"
        class="flex gap-2 items-center text-gh-text"
        to="/"
        aria-label="Homepage"
      >
        <MainLogo size="xs" />
        AgentScan
      </NuxtLink>
    </div>

    <div
      :class="{
        'fixed inset-0 bg-gh-bg z-40 md:relative flex flex-col gap-4 p-4 h-svh md:h-auto md:block md:relative md:bg-none':
          isMenuOpen,
      }"
    >
      <button @click="toggleMenu" class="md:hidden flex self-end">
        <span v-if="isMenuOpen" class="i-lucide:x"></span>
        <span v-else class="i-lucide:menu"></span>
      </button>

      <nav
        class="md:block h-full md:h-auto"
        :class="{
          hidden: !isMenuOpen,
        }"
      >
        <ul
          class="flex items-center gap-4"
          :class="{
            'flex justify-center h-full flex-col gap-6 md:flex md:flex-row md:h-auto ':
              isMenuOpen,
          }"
        >
          <li>
            <NuxtLink
              to="/health"
              class="inline-flex items-center text-gh-muted hover:text-gh-text transition-colors text-lg md:text-sm"
            >
              Ecosystem health
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/lab"
              class="inline-flex items-center text-gh-muted hover:text-gh-text transition-colors text-lg md:text-sm"
            >
              The lab
            </NuxtLink>
          </li>
          <li class="hidden md:block w-px h-4 bg-gh-border/80"></li>
          <li>
            <NuxtLink
              external
              target="_blank"
              to="https://github.com/marketplace/actions/agentscan"
              class="inline-flex items-center px-3.5 md:px-2.5 gap-1 py-1 font-medium text-md md:text-xs rounded-full border border-gh-border/80 text-gh-muted hover:text-gh-text hover:border-gh-border/60 transition-colors whitespace-nowrap"
              title="Use it as a GitHub Action"
            >
              GitHub action
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>
