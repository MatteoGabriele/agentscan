<script setup lang="ts">
const props = defineProps<{
  score?: number;
}>();

const { classes, icon, label } = useClassification(props.score);
</script>

<template>
  <div :class="['flex gap-2 items-center', classes.text]">
    <span :class="icon" class="text-base" />
    <h3 class="text-xl">
      {{ label }}
    </h3>
  </div>
</template>
