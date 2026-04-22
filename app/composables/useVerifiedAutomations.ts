import type { VerifiedAutomation } from "~~/shared/types/automation";

export function useVerifiedAutomations() {
  return useAsyncData("verified-list", async () => {
    return $fetch<VerifiedAutomation[]>("/api/verified-automations");
  });
}
