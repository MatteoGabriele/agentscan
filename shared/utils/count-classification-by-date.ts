import { identityConfig, type IdentityClassification } from "@unveil/identity";

type CountWithTrend = {
  count: number;
  trend: number;
};

type ClassificationCounts = {
  automation: CountWithTrend;
  mixed: CountWithTrend;
  organic: CountWithTrend;
};

type CountClassificationByDateResults = Record<string, ClassificationCounts>;

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
const classificationCategories = ["organic", "mixed", "automation"] as const;

type CategoryPercentageComparison = {
  category: IdentityClassification;
  lastDate: string | undefined;
  lastCount: number | null;
  lastTotal: number | null;
  lastPercentage: number | null;
  previousDate: string | undefined;
  previousCount: number | null;
  previousTotal: number | null;
  previousPercentage: number | null;
  percentagePointDifference: number | null;
};

type CategoryPercentageComparisons = Record<
  IdentityClassification,
  CategoryPercentageComparison
>;

function getTotalClassificationCount(
  counts: ClassificationCounts | undefined,
): number | null {
  if (!counts) return null;
  return classificationCategories.reduce(
    (total, category) => total + counts[category].count,
    0,
  );
}

function getCategoryPercentageFromCounts(
  counts: ClassificationCounts | undefined,
  category: IdentityClassification,
): number | null {
  const total = getTotalClassificationCount(counts);
  if (!counts || !total) return null;
  return Number(((counts[category].count / total) * 100).toFixed(2));
}

function getCategoryPercentageComparison({
  category,
  lastDate,
  previousDate,
  countsByDate,
}: {
  category: IdentityClassification;
  lastDate: string | undefined;
  previousDate: string | undefined;
  countsByDate: CountClassificationByDateResults;
}): CategoryPercentageComparison {
  const previousCounts = previousDate ? countsByDate[previousDate] : undefined;
  const lastCounts = lastDate ? countsByDate[lastDate] : undefined;
  const previousPercentage = getCategoryPercentageFromCounts(
    previousCounts,
    category,
  );

  const lastPercentage = getCategoryPercentageFromCounts(lastCounts, category);

  return {
    category,

    previousDate,
    previousCount: previousCounts?.[category].count ?? null,
    previousTotal: getTotalClassificationCount(previousCounts),
    previousPercentage,

    lastDate,
    lastCount: lastCounts?.[category].count ?? null,
    lastTotal: getTotalClassificationCount(lastCounts),
    lastPercentage,

    percentagePointDifference:
      previousPercentage === null || lastPercentage === null
        ? null
        : Math.round((lastPercentage - previousPercentage) * 10) / 10,
  };
}

export function getCategoryDeltas(
  results: EcosystemHealthItem[],
): CategoryPercentageComparisons {
  const countsByDate = countClassificationByDate(results);
  const dates = Object.keys(countsByDate).sort();
  const previousDate = dates.at(-2);
  const lastDate = dates.at(-1);
  return classificationCategories.reduce((comparisons, category) => {
    comparisons[category] = getCategoryPercentageComparison({
      category,
      lastDate,
      previousDate,
      countsByDate,
    });
    return comparisons;
  }, {} as CategoryPercentageComparisons);
}
