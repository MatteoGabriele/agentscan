import dayjs from "dayjs";

export async function useFlaggedAgents() {
  const { data: flaggedAgents } = await useFetch(
    () => "/api/verified-automations",
    {
      key: "verified-list",
      default: () => [],
    },
  );

  const latestFlaggedAgents = computed(() => {
    return flaggedAgents.value
      .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
      .slice(0, 3);
  });

  return {
    flaggedAgents,
    latestFlaggedAgents,
  };
}
