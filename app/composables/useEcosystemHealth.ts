import type { EcosystemHealthItem } from "~~/shared/types/ecosystem-health";

export function useEcosystemHealth() {
  return useAsyncData(
    "ecosystem-health",
    async () => {
      return $fetch<EcosystemHealthItem[]>("/api/health");
    },
    {
      default: () => [],
    },
  );
}
