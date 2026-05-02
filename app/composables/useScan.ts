import type { Scan } from "~~/shared/types/scan";

export function useScan() {
  return useLazyAsyncData("scan", async () => {
    return $fetch<Scan[]>("/api/scan");
  });
}
