import { identityConfig } from "@unveil/identity";

type CountWithTrend = {
  count: number;
  trend: number;
};

type CountClassificationByDateResults = Record<
  string,
  {
    automation: CountWithTrend;
    mixed: CountWithTrend;
    organic: CountWithTrend;
  }
>;

export function countClassificationByDate(
  data: EcosystemHealthItem[] = [],
): CountClassificationByDateResults {
  const result: CountClassificationByDateResults = {};

  const dates = [...new Set(data.map((item) => item.created_at))].sort();

  dates.forEach((date) => {
    result[date] = {
      automation: { count: 0, trend: 0 },
      mixed: { count: 0, trend: 0 },
      organic: { count: 0, trend: 0 },
    };
  });

  data.forEach((item) => {
    const dateCounts = result[item.created_at];

    if (!dateCounts) {
      return;
    }

    if (item.score >= identityConfig.THRESHOLD_HUMAN) {
      dateCounts.organic.count += 1;
    } else if (item.score >= identityConfig.THRESHOLD_SUSPICIOUS) {
      dateCounts.mixed.count += 1;
    } else {
      dateCounts.automation.count += 1;
    }
  });

  return result;
}
