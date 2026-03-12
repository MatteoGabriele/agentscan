import type { VerifiedAutomation } from "~~/shared/types/automation";

export function useVerifiedAutomations() {
  return useLazyAsyncData("verified-list", async () => {
    return $fetch<VerifiedAutomation[]>("/api/verified-automations");
  });
}
