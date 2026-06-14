export async function useContributorsList() {
  return useAsyncData("contributors-list", () => $fetch("/api/contributors"));
}
