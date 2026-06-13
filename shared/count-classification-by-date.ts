import { identityConfig } from "@unveil/identity";

export function countClassificationByDate(data: EcosystemHealthItem[] = []) {
  const result: Record<string, EcosystemHealthCategoryCounts> = {};

  const dates = [...new Set(data.map((item) => item.created_at))].sort();

  dates.forEach((date) => {
    result[date] = {
      automation: 0,
      mixed: 0,
      organic: 0,
    };
  });

  data.forEach((item) => {
    const dateCounts = result[item.created_at];

    if (!dateCounts) return;

    if (item.score <= identityConfig.THRESHOLD_SUSPICIOUS) {
      dateCounts.automation += 1;
    } else if (item.score <= identityConfig.THRESHOLD_HUMAN) {
      dateCounts.mixed += 1;
    } else {
      dateCounts.organic += 1;
    }
  });

  return result;
}
