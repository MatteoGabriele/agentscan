import type { IntegrationItem } from "~~/shared/types/integrations";

export function useIntegrations() {
  return useLazyAsyncData("integrations", async () => {
    return $fetch<IntegrationItem[]>("/api/integration/unsafe-labs");
  });
}
