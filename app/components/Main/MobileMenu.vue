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
  <div>
    <button @click="toggleMenu" class="lg:hidden flex self-end">
      <span v-if="isMenuOpen" class="i-lucide:x"></span>
      <span v-else class="i-lucide:menu"></span>
    </button>
  </div>
</template>
