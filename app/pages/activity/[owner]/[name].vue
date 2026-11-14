<script setup lang="ts">
// The repo report now lives on the scan page, next to the live scan.
const route = useRoute()

await navigateTo(`/scan/${route.params.owner}/${route.params.name}`, {
  redirectCode: 301,
})
</script>

<template>
  <div />
</template>
