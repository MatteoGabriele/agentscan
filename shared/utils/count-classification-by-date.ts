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

export const CLASSIFICATION_CATEGORIES = [
  "organic",
  "mixed",
  "automation",
] as const;

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

function getDateKey(date: string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function createEmptyClassificationCounts(): ClassificationCounts {
  return {
    automation: { count: 0, trend: 0 },
    mixed: { count: 0, trend: 0 },
    organic: { count: 0, trend: 0 },
  };
}

export function countClassificationByDate(
  data: EcosystemHealthItem[] = [],
): CountClassificationByDateResults {
  const result: CountClassificationByDateResults = {};

  const dates = [
    ...new Set(data.map((item) => getDateKey(item.created_at))),
  ].sort();

  dates.forEach((date) => {
    result[date] = createEmptyClassificationCounts();
  });

  data.forEach((item) => {
    const dateCounts = result[getDateKey(item.created_at)];

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

function getTotalClassificationCount(
  counts: ClassificationCounts | undefined,
): number | null {
  if (!counts) return null;
  return CLASSIFICATION_CATEGORIES.reduce(
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
  return CLASSIFICATION_CATEGORIES.reduce((comparisons, category) => {
    comparisons[category] = getCategoryPercentageComparison({
      category,
      lastDate,
      previousDate,
      countsByDate,
    });
    return comparisons;
  }, {} as CategoryPercentageComparisons);
}

function getPreviousDays({
  date,
  length,
  offset = 0,
}: {
  date: string;
  length: number;
  offset?: number;
}): Set<string> {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const endDate = new Date(`${getDateKey(date)}T00:00:00.000Z`);

  return new Set(
    Array.from({ length }, (_, dayOffset) => {
      const currentDate = new Date(
        endDate.getTime() - (dayOffset + offset) * millisecondsPerDay,
      );

      return getDateKey(currentDate.toISOString());
    }),
  );
}

function sumClassificationCountsByDates({
  countsByDate,
  dates,
}: {
  countsByDate: CountClassificationByDateResults;
  dates: Set<string>;
}): ClassificationCounts {
  const result = createEmptyClassificationCounts();

  dates.forEach((date) => {
    const counts = countsByDate[date];

    if (!counts) {
      return;
    }

    CLASSIFICATION_CATEGORIES.forEach((category) => {
      result[category].count += counts[category].count;
    });
  });

  return result;
}

function getClassificationCountTrend({
  currentCount,
  previousCount,
}: {
  currentCount: number;
  previousCount: number;
}): number {
  if (previousCount === 0) {
    return currentCount === 0 ? 0 : 100;
  }

  return Number(
    (((currentCount - previousCount) / previousCount) * 100).toFixed(1),
  );
}

export function getClassificationForPreviousDays({
  data = [],
  date,
  days,
}: {
  data?: EcosystemHealthItem[];
  date: string;
  days: number;
}): ClassificationCounts {
  if (!Number.isInteger(days) || days < 1) {
    return createEmptyClassificationCounts();
  }

  const countsByDate = countClassificationByDate(data);

  const currentDays = getPreviousDays({
    date,
    length: days,
  });

  const previousDays = getPreviousDays({
    date,
    length: days,
    offset: days,
  });

  const currentCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: currentDays,
  });

  const previousCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: previousDays,
  });

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    currentCounts[category].trend = getClassificationCountTrend({
      currentCount: currentCounts[category].count,
      previousCount: previousCounts[category].count,
    });
  });

  return currentCounts;
}

export function getWeeklyClassification(
  data: EcosystemHealthItem[] = [],
  date: string,
): ClassificationCounts {
  return getClassificationForPreviousDays({
    data,
    date,
    days: 7,
  });
}

type ClassificationChunk = {
  startDate: string;
  endDate: string;
  days: number;
  classification: ClassificationCounts;
};

export function getClassificationByDateChunks({
  data = [],
  dates = [],
  days = 7,
}: {
  data?: EcosystemHealthItem[];
  dates?: string[];
  days?: number;
}): ClassificationChunk[] {
  if (!Number.isInteger(days) || days < 1) {
    return [];
  }

  const sortedDates = [...dates].sort();

  return Array.from(
    { length: Math.ceil(sortedDates.length / days) },
    (_, chunkIndex) => {
      const chunk = sortedDates.slice(
        chunkIndex * days,
        chunkIndex * days + days,
      );
      const startDate = chunk.at(0);
      const endDate = chunk.at(-1);

      if (!startDate || !endDate) {
        return null;
      }

      return {
        startDate,
        endDate,
        days: chunk.length,
        classification: getClassificationForPreviousDays({
          data,
          date: endDate,
          days: chunk.length,
        }),
      };
    },
  ).filter((chunk): chunk is ClassificationChunk => Boolean(chunk));
}
