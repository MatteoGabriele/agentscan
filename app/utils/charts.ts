import type { VueUiHorizontalBarDatasetItem } from "vue-data-ui/vue-ui-horizontal-bar";

export function getCompleteDayRange(days: string[]): string[] {
  if (!days.length) {
    return [];
  }

  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;
  const firstDayTime = new Date(firstDay).getTime();
  const lastDayTime = new Date(lastDay).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const completeDays: string[] = [];

  for (let time = firstDayTime; time <= lastDayTime; time += oneDay) {
    completeDays.push(new Date(time).toISOString().slice(0, 10));
  }

  return completeDays;
}

// Horizontal bar for package scores

function getDayKey(date: string | Date) {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function convertToHorizontalBarDataset(
  source: EcosystemHealthItem[] = [],
  date?: Date | string | null,
): VueUiHorizontalBarDatasetItem[] {
  const targetDay = date ? getDayKey(date) : null;

  const grouped = source.reduce<
    Record<string, { total: number; count: number }>
  >((acc, item) => {
    const createdDay = getDayKey(item.created_at);

    if (targetDay && createdDay !== targetDay) {
      return acc;
    }

    const existing = acc[item.repo_name] ?? { total: 0, count: 0 };

    acc[item.repo_name] = {
      total: existing.total + item.score,
      count: existing.count + 1,
    };

    return acc;
  }, {});

  return Object.entries(grouped).map(([name, { total, count }]) => ({
    name,
    value: total / count,
  }));
}
