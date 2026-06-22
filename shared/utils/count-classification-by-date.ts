import { identityConfig, type IdentityClassification } from "@unveil/identity";
import { round } from "./numbers";

export type ClassificationMetric = {
  count: number;
  trend: number;
  percentage: number;
};

export type ClassificationStats = {
  automation: ClassificationMetric;
  mixed: ClassificationMetric;
  organic: ClassificationMetric;
  total: ClassificationMetric;
  createdAt: string | null;
};

type getClassificationStatsByDateResults = Record<string, ClassificationStats>;

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

function createEmptyClassificationStats(): ClassificationStats {
  return {
    automation: { count: 0, trend: 0, percentage: 0 },
    mixed: { count: 0, trend: 0, percentage: 0 },
    organic: { count: 0, trend: 0, percentage: 0 },
    total: { count: 0, trend: 0, percentage: 100 },
    createdAt: null,
  };
}

export function getClassificationStatsByDate(
  data: EcosystemHealthItem[] = [],
): getClassificationStatsByDateResults {
  const result: getClassificationStatsByDateResults = {};

  const dates = [
    ...new Set(data.map((item) => getDateKey(item.created_at))),
  ].sort();

  dates.forEach((date) => {
    result[date] = createEmptyClassificationStats();
  });

  data.forEach((item) => {
    const dateCounts = result[getDateKey(item.created_at)];

    if (!dateCounts) {
      return;
    }

    if (!dateCounts.createdAt) {
      dateCounts.createdAt = item.created_at;
    }

    if (item.score >= identityConfig.THRESHOLD_HUMAN) {
      dateCounts.organic.count += 1;
    } else if (item.score >= identityConfig.THRESHOLD_SUSPICIOUS) {
      dateCounts.mixed.count += 1;
    } else {
      dateCounts.automation.count += 1;
    }
    dateCounts.total.count =
      dateCounts.automation.count +
      dateCounts.mixed.count +
      dateCounts.organic.count;

    dateCounts.automation.percentage = round(
      (dateCounts.automation.count / dateCounts.total.count) * 100,
    );
    dateCounts.mixed.percentage = round(
      (dateCounts.mixed.count / dateCounts.total.count) * 100,
    );
    dateCounts.organic.percentage = round(
      (dateCounts.organic.count / dateCounts.total.count) * 100,
    );
  });

  return result;
}

function getTotalClassificationCount(
  counts: ClassificationStats | undefined,
): number | null {
  if (!counts) return null;
  return CLASSIFICATION_CATEGORIES.reduce(
    (total, category) => total + counts[category].count,
    0,
  );
}

function getCategoryPercentage(
  counts: ClassificationStats | undefined,
  category: IdentityClassification,
): number | null {
  if (!counts || counts.total.count === 0) {
    return null;
  }

  return Number(counts[category].percentage.toFixed(1));
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
  countsByDate: getClassificationStatsByDateResults;
}): CategoryPercentageComparison {
  const previousCounts = previousDate ? countsByDate[previousDate] : undefined;
  const lastCounts = lastDate ? countsByDate[lastDate] : undefined;
  const previousPercentage = getCategoryPercentage(previousCounts, category);

  const lastPercentage = getCategoryPercentage(lastCounts, category);

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
        : round(lastPercentage - previousPercentage, 1),
  };
}

export function getCategoryDeltas(
  results: EcosystemHealthItem[],
): CategoryPercentageComparisons {
  const countsByDate = getClassificationStatsByDate(results);
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

function getNextDays({
  date,
  length,
}: {
  date: string;
  length: number;
}): Set<string> {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const startDate = new Date(`${getDateKey(date)}T00:00:00.000Z`);
  return new Set(
    Array.from({ length }, (_, dayOffset) => {
      const currentDate = new Date(
        startDate.getTime() + dayOffset * millisecondsPerDay,
      );
      return getDateKey(currentDate.toISOString());
    }),
  );
}

function getMondayDateKey(date: string): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const currentDate = new Date(`${getDateKey(date)}T00:00:00.000Z`);
  const dayOfWeek = currentDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(
    currentDate.getTime() - daysSinceMonday * millisecondsPerDay,
  );

  return getDateKey(monday.toISOString());
}

function getPreviousMondayDateKey(date: string): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const monday = new Date(`${getMondayDateKey(date)}T00:00:00.000Z`);
  return getDateKey(
    new Date(monday.getTime() - 7 * millisecondsPerDay).toISOString(),
  );
}

function applyClassificationCountTrends({
  currentCounts,
  previousCounts,
}: {
  currentCounts: ClassificationStats;
  previousCounts: ClassificationStats;
}): ClassificationStats {
  const currentCountsWithPercentages =
    applyClassificationPercentages(currentCounts);
  const previousCountsWithPercentages =
    applyClassificationPercentages(previousCounts);

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    currentCountsWithPercentages[category].trend =
      getClassificationPercentageTrend({
        currentPercentage: currentCountsWithPercentages[category].percentage,
        previousPercentage: previousCountsWithPercentages[category].percentage,
      });
  });

  return currentCountsWithPercentages;
}

function sumClassificationCountsByDates({
  countsByDate,
  dates,
}: {
  countsByDate: getClassificationStatsByDateResults;
  dates: Set<string>;
}): ClassificationStats {
  const result = createEmptyClassificationStats();

  dates.forEach((date) => {
    const counts = countsByDate[date];

    if (!counts) {
      return;
    }

    CLASSIFICATION_CATEGORIES.forEach((category) => {
      result[category].count += counts[category].count;
    });
  });

  return applyClassificationPercentages(result);
}

function applyClassificationPercentages(
  counts: ClassificationStats,
): ClassificationStats {
  const total = CLASSIFICATION_CATEGORIES.reduce((total, category) => {
    return total + counts[category].count;
  }, 0);

  counts.total.count = total;
  counts.total.percentage = total === 0 ? 0 : 100;

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    counts[category].percentage =
      total === 0 ? 0 : round((counts[category].count / total) * 100);
  });

  return counts;
}

function getClassificationPercentageTrend({
  currentPercentage,
  previousPercentage,
}: {
  currentPercentage: number;
  previousPercentage: number;
}): number {
  if (previousPercentage === 0) {
    return currentPercentage === 0 ? 0 : 100;
  }

  return round(
    ((currentPercentage - previousPercentage) / previousPercentage) * 100,
    1,
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
}): ClassificationStats {
  if (!Number.isInteger(days) || days < 1) {
    return createEmptyClassificationStats();
  }

  const countsByDate = getClassificationStatsByDate(data);

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

  return applyClassificationCountTrends({
    currentCounts,
    previousCounts,
  });
}

export function getWeeklyClassification(
  data: EcosystemHealthItem[] = [],
  date: string,
  rolling = true,
): ClassificationStats {
  if (rolling) {
    return getClassificationForPreviousDays({
      data,
      date,
      days: 7,
    });
  }

  const countsByDate = getClassificationStatsByDate(data);

  const currentWeekDays = getNextDays({
    date: getMondayDateKey(date),
    length: 7,
  });

  const previousWeekDays = getNextDays({
    date: getPreviousMondayDateKey(date),
    length: 7,
  });

  const currentCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: currentWeekDays,
  });

  const previousCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: previousWeekDays,
  });

  return applyClassificationCountTrends({
    currentCounts,
    previousCounts,
  });
}

type ClassificationChunk = {
  startDate: string;
  endDate: string;
  days: number;
  classification: ClassificationStats;
};

function getSundayDateKey(date: string): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const monday = new Date(`${getMondayDateKey(date)}T00:00:00.000Z`);

  return getDateKey(
    new Date(monday.getTime() + 6 * millisecondsPerDay).toISOString(),
  );
}

function getCalendarWeekStartDates(dates: string[]): string[] {
  return [...new Set(dates.map((date) => getMondayDateKey(date)))].sort();
}

function getClassificationByCalendarWeekChunks({
  data = [],
  dates = [],
}: {
  data?: EcosystemHealthItem[];
  dates?: string[];
}): ClassificationChunk[] {
  const availableDateKeys = new Set(dates.map((date) => getDateKey(date)));

  return getCalendarWeekStartDates(dates)
    .map((startDate) => {
      const weekDays = getNextDays({
        date: startDate,
        length: 7,
      });

      const endDate = getSundayDateKey(startDate);
      const isCompleteWeek = [...weekDays].every((date) => {
        return availableDateKeys.has(date);
      });

      if (!isCompleteWeek) {
        return null;
      }

      return {
        startDate,
        endDate,
        days: 7,
        classification: getWeeklyClassification(data, endDate, false),
      };
    })
    .filter((chunk): chunk is ClassificationChunk => Boolean(chunk));
}

export function getClassificationByDateChunks({
  data = [],
  dates = [],
  days = 7,
  rolling = true,
}: {
  data?: EcosystemHealthItem[];
  dates?: string[];
  days?: number;
  rolling?: boolean;
}): ClassificationChunk[] {
  if (!Number.isInteger(days) || days < 1) {
    return [];
  }

  if (!rolling && days === 7) {
    return getClassificationByCalendarWeekChunks({
      data,
      dates,
    });
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
