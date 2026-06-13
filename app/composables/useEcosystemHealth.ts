export function useEcosystemHealth() {
  return useAsyncData("ecosystem-health", async () => {
    return $fetch("/api/health");
  });
}
