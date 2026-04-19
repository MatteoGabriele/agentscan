<script setup lang="ts">
const props = defineProps<{
  error?: any;
  username?: string;
}>();

const { data: verifiedAutomations } = useVerifiedAutomations();

const isFlaggedAccount = computed(() => {
  return verifiedAutomations.value?.some((automation) => {
    return automation.username === props.username;
  });
});
</script>

<template>
  <div
    v-if="error?.statusCode === 404"
    class="bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border text-center"
  >
    <template v-if="isFlaggedAccount">
      <span
        class="i-carbon:gift text-xl text-gh-muted mx-auto mb-4 block"
        aria-hidden="true"
      />
      <h3 class="text-xl font-mono text-gh-text mb-1">Good news</h3>
      <p class="text-gh-muted text-sm text-pretty">
        This flagged account seems to be no longer active.
      </p>
    </template>
    <template v-else>
      <span
        class="i-carbon:error text-xl text-gh-muted mx-auto mb-4 block"
        aria-hidden="true"
      />
      <h3 class="text-xl font-mono text-gh-text mb-1">User not found</h3>
      <p class="text-gh-muted text-sm">
        Double-check the username and try again
      </p>
    </template>
  </div>
  <ErrorCardGeneric :error v-else />
</template>
