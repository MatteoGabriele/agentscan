import { calcLinearProgression } from "#imports";

export function useEcosystemHealthCategoryProgression() {
  const { dates, countsByDate } = useEcosystemHealthCountsByDate();

  const progression = computed(() => {
    const automation: number[] = [];
    const mixed: number[] = [];
    const organic: number[] = [];

    dates.value.forEach((date) => {
      const counts = countsByDate.value[date];
      automation.push(counts?.automation ?? 0);
      mixed.push(counts?.mixed ?? 0);
      organic.push(counts?.organic ?? 0);
    });

    return {
      automation: calcLinearProgression(automation),
      mixed: calcLinearProgression(mixed),
      organic: calcLinearProgression(organic),
    };
  });

  return { progression };
}
