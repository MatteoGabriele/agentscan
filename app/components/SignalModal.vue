<script setup lang="ts">
const props = defineProps<{
  accountName: string;
  isFlagged?: boolean;
}>();

const emits = defineEmits(["close", "submit"]);
function closeModal() {
  emits("close");
}

async function addSignal() {
  await $fetch("/api/signals/create", {
    method: "POST",
    body: { githubUsername: props.accountName, reaction: "signal" },
  });
}

async function removeSignal() {
  await $fetch("/api/signals/delete", {
    method: "POST",
    body: { githubUsername: props.accountName },
  });
}

const isPending = ref<boolean>(false);
async function toggleSignal() {
  isPending.value = true;

  if (props.isFlagged) {
    await removeSignal();
  } else {
    await addSignal();
  }

  emits("submit");
}
</script>

<template>
  <Modal @close="closeModal">
    <div class="my-6 text-center">
      <h2 class="text-xl text-gh-text mb-1">
        <template v-if="isFlagged"> Remove automated signal? </template>
        <template v-else> Signal as automated? </template>
      </h2>

      <p class="text-gh-muted text-sm">
        <template v-if="isFlagged">
          Remove this if you're confident the
          <strong>{{ accountName }}</strong
          >'s account is not automated.
        </template>
        <template v-else>
          Only signal if you're confident this account is automated.
        </template>
      </p>
    </div>
    <button
      @click="toggleSignal"
      class="w-full py-2 px-6 bg-gh-red rounded-md text-white hover:bg-gh-red-hover flex justify-center items-center gap-2 transition-colors"
    >
      <span
        v-if="isPending"
        class="i-carbon-circle-dash animate-spin text-lg"
      />
      <template v-else-if="isFlagged">
        <span class="i-carbon:connection-signal text-lg" aria-hidden="true" />
        Remove signal
      </template>
      <template v-else>
        <span class="i-carbon:connection-signal text-lg" aria-hidden="true" />
        Signal account
      </template>
    </button>

    <p class="text-xs text-center mt-4 text-balance">
      <template v-if="isFlagged">
        Your Bluesky avatar will be removed from this account page.
      </template>
      <template v-else>
        Your Bluesky avatar will be shown publicly on this account page.
      </template>
    </p>
  </Modal>
</template>
