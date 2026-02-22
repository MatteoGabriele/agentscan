<script setup lang="ts">
const route = useRoute();

const handle = ref<string>("");
async function handleSubmit() {
  const { url } = await $fetch("/api/auth/login", {
    method: "POST",
    body: {
      handle: handle.value,
      redirectTo: route.fullPath,
    },
  });
  window.location.href = url;
}
</script>

<template>
  <div class="fixed border inset-0 z-10">
    <dialog open class="flex items-center justify-center w-full h-full">
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-2">
        <input
          class="border border-white w-lg p-2"
          type="text"
          v-model="handle"
        />
        <button type="submit">Login</button>
      </form>
    </dialog>
  </div>
</template>
