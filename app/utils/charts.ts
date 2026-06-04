import type { VueUiHorizontalBarDatasetItem } from "vue-data-ui/vue-ui-horizontal-bar";
import type { VueUiXyDatasetItem } from "vue-data-ui/vue-ui-xy";

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

// Evolution of pull request closure rates by repository for PRs in a given score range.

export type ScoreBounds = [min: number, max: number];

export type RepoClosedPrOptions = {
  repoKey?: keyof EcosystemHealthItem;
  prNumberKey?: keyof EcosystemHealthItem;
  stateKey?: keyof EcosystemHealthItem;
  scoreKey?: keyof EcosystemHealthItem;
  dateKey?: keyof EcosystemHealthItem;
  scoreBounds?: ScoreBounds;
  openState?: string;
  closedState?: string;
  includeAlreadyClosed?: boolean;
};

export function getClosedPrPercentageByRepo(
  source: EcosystemHealthItem[],
  options: RepoClosedPrOptions = {},
) {
  const {
    repoKey = "repo_name",
    prNumberKey = "pr_number",
    stateKey = "pr_status",
    scoreKey = "score",
    scoreBounds = [0, 100],
    openState = "open",
    closedState = "closed",
  } = options;

  const resolvedScoreBounds: ScoreBounds = Array.isArray(scoreBounds)
    ? scoreBounds
    : [0, Number(scoreBounds)];

  const [minScore, maxScore] = resolvedScoreBounds;

  const byRepo = new Map<string, Map<number, EcosystemHealthItem[]>>();

  source.forEach((entry) => {
    const repo = String(entry[repoKey]);
    const prNumber = Number(entry[prNumberKey]);

    if (!repo || Number.isNaN(prNumber)) return;

    if (!byRepo.has(repo)) {
      byRepo.set(repo, new Map());
    }

    const repoMap = byRepo.get(repo);
    if (!repoMap) return;

    if (!repoMap.has(prNumber)) {
      repoMap.set(prNumber, []);
    }

    repoMap.get(prNumber)?.push(entry);
  });

  return Array.from(byRepo.entries()).map(([repo, pullRequests]) => {
    let eligiblePrs = 0;
    let closedPrs = 0;

    pullRequests.forEach((entries) => {
      const entriesInScoreRange = entries.filter((entry) => {
        const score = Number(entry[scoreKey]);
        const status = String(entry[stateKey]).toLowerCase();

        return (
          !Number.isNaN(score) &&
          score >= minScore &&
          score <= maxScore &&
          (status === openState || status === closedState)
        );
      });

      if (!entriesInScoreRange.length) return;

      const hasClosedEntry = entriesInScoreRange.some((entry) => {
        return String(entry[stateKey]).toLowerCase() === closedState;
      });

      eligiblePrs += 1;

      if (hasClosedEntry) {
        closedPrs += 1;
      }
    });

    return {
      repo,
      eligiblePrs,
      closedPrs,
      percentage: eligiblePrs
        ? Number(((closedPrs / eligiblePrs) * 100).toFixed(2))
        : 100,
    };
  });
}

export function getUniqueDatesFromSource(
  source: EcosystemHealthItem[],
  dateKey: keyof EcosystemHealthItem = "created_at",
) {
  return Array.from(
    new Set(
      source
        .map((entry) => {
          const rawDate = entry[dateKey];
          if (rawDate == null) return null;
          return getDayKey(String(rawDate));
        })
        .filter((date): date is string => date !== null),
    ),
  ).sort();
}

export function getClosedPrPercentageByRepoForDate(
  source: EcosystemHealthItem[],
  untilDate: string | Date,
  options: RepoClosedPrOptions = {},
) {
  const { dateKey = "created_at" } = options;
  const limitDay = getDayKey(untilDate);
  const filteredSource = source.filter((entry) => {
    return getDayKey(String(entry[dateKey])) === limitDay; // <= limitDay to make it cumulative instead of daily
  });
  return getClosedPrPercentageByRepo(filteredSource, options);
}

export type ClosedPrPercentageEvolutionSeries = {
  name: string;
  data: (number | null)[];
};

/**
 * Sorry for the beefy comment but could not make the code clearer.
 * ---
 * Computes the daily snapshot closure-rate evolution for each repository.
 *
 * Each point represents the state of a repository on a specific day, not a
 * cumulative history up to that day.
 *
 * For a given day:
 * - Only entries where `dateKey` matches that given day are considered
 * - PRs are deduped by `pr_number`
 * - A PR is considered closed if at least one entry for that PR on that day has a closed status
 * - A PR is considered eligible if it has at least one entry within the selected score range for that day
 *
 * Closure rate is calculated as:
 *
 *   closedPrs / eligiblePrs
 *
 * Because this is a daily snapshot:
 * - The closedPrs numerator may vary from one day to another
 * - The eligiblePrs denominator may also vary from one day to the next
 * - If a PR is absent from a later snapshot, it no longer contributes to the
 *   closure rate for that day, even if it was counted previously
 *
 * Empty snapshots (0 eligible PRs) are represented as 100%
 */
export function getClosedPrPercentageEvolutionByRepo(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = "created_at",
): Array<Array<VueUiXyDatasetItem & { hasData: boolean }>> {
  const dates = getUniqueDatesFromSource(source, dateKey);

  const repoMap = new Map<
    string,
    {
      percentages: (number | null)[];
      eligiblePrs: number[];
      closedPrs: number[];
    }
  >();

  dates.forEach((date, dateIndex) => {
    const results = getClosedPrPercentageByRepoForDate(source, date, {
      scoreBounds,
      dateKey,
    });

    results.forEach((result) => {
      if (!repoMap.has(result.repo)) {
        repoMap.set(result.repo, {
          percentages: Array(dates.length).fill(100),
          eligiblePrs: Array(dates.length).fill(0),
          closedPrs: Array(dates.length).fill(0),
        });
      }

      const repoData = repoMap.get(result.repo);

      if (!repoData) return;

      repoData.percentages[dateIndex] = result.percentage;
      repoData.eligiblePrs[dateIndex] = result.eligiblePrs;
      repoData.closedPrs[dateIndex] = result.closedPrs;
    });
  });

  return Array.from(repoMap.entries()).map(([name, data]) => [
    {
      name,
      series: data.percentages,
      type: "line",
      smooth: true,
      hasData: data.percentages.some((value) => value !== null),
      details: {
        eligiblePrs: data.eligiblePrs,
        closedPrs: data.closedPrs,
      },
    },
  ]);
}

export function getClosedPrPercentageEvolutionTotal(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = "created_at",
): VueUiXyDatasetItem {
  const dates = getUniqueDatesFromSource(source, dateKey);

  const series = dates.map((date) => {
    const results = getClosedPrPercentageByRepoForDate(source, date, {
      scoreBounds,
      dateKey,
    });

    const totalEligible = results.reduce(
      (sum, result) => sum + result.eligiblePrs,
      0,
    );

    const totalClosed = results.reduce(
      (sum, result) => sum + result.closedPrs,
      0,
    );

    return totalEligible > 0 ? (totalClosed / totalEligible) * 100 : 100;
  });

  return {
    name: "Automation PR closure rate",
    series: series.map((value) => Math.round(value)),
    type: "line",
    smooth: true,
  };
}

export function getClosedPrPercentageTotal(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
): number | null {
  const results = getClosedPrPercentageByRepo(source, { scoreBounds });
  const totalEligible = results.reduce((s, r) => s + r.eligiblePrs, 0);
  const totalClosed = results.reduce((s, r) => s + r.closedPrs, 0);
  if (totalEligible === 0) return 100;
  return Math.round((totalClosed / totalEligible) * 100);
}
