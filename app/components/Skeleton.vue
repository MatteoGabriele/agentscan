<script setup lang="ts">
interface Props {
  width?: string;
  height?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

const props = withDefaults(defineProps<Props>(), {
  width: "w-full",
  height: "h-4",
  rounded: "md",
});

const roundedClasses = {
  none: "rounded-none",
  sm: "rounded-1",
  md: "rounded-2",
  lg: "rounded-3",
  full: "rounded-full",
};
</script>

<template>
  <div
    :class="[
      'bg-gradient-to-r from-gh-border/30 via-gh-border/50 to-gh-border/30 animate-shimmer',
      props.width,
      props.height,
      roundedClasses[props.rounded],
    ]"
  />
</template>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -100px 0;
  }
  100% {
    background-position: 100px 0;
  }
}

.animate-shimmer {
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
</style>
