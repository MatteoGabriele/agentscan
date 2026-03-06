import type { VerifiedAutomation } from "~~/server/api/verified-automations.get";

export function useVerifiedAutomations() {
  return useLazyAsyncData("verified-list", async () => {
    return $fetch<VerifiedAutomation[]>("/api/verified-automations");
  });
}
