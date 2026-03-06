<script setup lang="ts">
const props = defineProps<{
  isFlagged?: boolean;
}>();

const emptyStateClasses = computed(() => {
  if (props.isFlagged) {
    return "text-gh-danger border-gh-danger bg-gh-danger/20";
  }

  return "text-green-500 border-green-500 bg-green-500/20";
});

const emptyStateText = computed<string>(() => {
  if (props.isFlagged) {
    return "It has been flagged by the community";
  }

  return "No unusual activity found";
});
</script>

<template>
  <div
    class="border-1 border-solid p-6 rounded-2 text-center"
    :class="emptyStateClasses"
  >
    <p>{{ emptyStateText }}</p>
  </div>
</template>
