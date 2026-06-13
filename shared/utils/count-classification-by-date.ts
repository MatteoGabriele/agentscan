import { identityConfig } from "@unveil/identity";

type CountClassificationByDateResults = Record<
  string,
  EcosystemHealthCategoryCounts
>;

export function countClassificationByDate(
  data: EcosystemHealthItem[] = [],
): CountClassificationByDateResults {
  const result: CountClassificationByDateResults = {};

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

    if (!dateCounts) {
      return;
    }

    if (item.score >= identityConfig.THRESHOLD_HUMAN) {
      dateCounts.organic += 1;
    } else if (item.score >= identityConfig.THRESHOLD_SUSPICIOUS) {
      dateCounts.mixed += 1;
    } else {
      dateCounts.automation += 1;
    }
  });

  return result;
}
