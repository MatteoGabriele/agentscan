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
    dateKey = "created_at",
    scoreBounds = [0, 100],
    openState = "open",
    closedState = "closed",
    includeAlreadyClosed = true,
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
    if (!byRepo.has(repo)) byRepo.set(repo, new Map());

    const repoMap = byRepo.get(repo);
    if (!repoMap) return;
    if (!repoMap.has(prNumber)) repoMap.set(prNumber, []);

    const pullRequestEntries = repoMap.get(prNumber);
    if (!pullRequestEntries) return;
    pullRequestEntries.push(entry);
  });

  return Array.from(byRepo.entries()).map(([repo, pullRequests]) => {
    let elligiblePrs = 0;
    let closedPrs = 0;

    pullRequests.forEach((entries) => {
      if (!entries.length) return;

      const sortedEntries = [...entries].sort((a, b) => {
        return (
          new Date(String(a[dateKey])).getTime() -
          new Date(String(b[dateKey])).getTime()
        );
      });

      const oldestEntry = sortedEntries[0];
      if (!oldestEntry) return;

      const latestEntry =
        sortedEntries.length > 1
          ? sortedEntries[sortedEntries.length - 1]
          : undefined;

      const oldestStatus = String(oldestEntry[stateKey]).toLowerCase();
      const oldestScore = Number(oldestEntry[scoreKey]);
      const isAlreadyClosed = oldestStatus === closedState;

      const isEligible =
        oldestScore >= minScore &&
        oldestScore <= maxScore &&
        (oldestStatus === openState ||
          (includeAlreadyClosed && isAlreadyClosed));

      if (!isEligible) return;

      elligiblePrs += 1;

      if (isAlreadyClosed) {
        closedPrs += 1;
        return;
      }

      if (!latestEntry) return;
      const latestStatus = String(latestEntry[stateKey]).toLowerCase();
      if (latestStatus === closedState) closedPrs += 1;
    });

    return {
      repo,
      elligiblePrs,
      closedPrs,
      percentage: elligiblePrs
        ? Number(((closedPrs / elligiblePrs) * 100).toFixed(2))
        : 0,
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

export function getClosedPrPercentageByRepoUntilDate(
  source: EcosystemHealthItem[],
  untilDate: string | Date,
  options: RepoClosedPrOptions = {},
) {
  const { dateKey = "created_at" } = options;
  const limitDay = getDayKey(untilDate);
  const filteredSource = source.filter((entry) => {
    return getDayKey(String(entry[dateKey])) <= limitDay;
  });
  return getClosedPrPercentageByRepo(filteredSource, options);
}

export type ClosedPrPercentageEvolutionSeries = {
  name: string;
  data: (number | null)[];
};

export function getClosedPrPercentageEvolutionByRepo(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = "created_at",
): Array<Array<VueUiXyDatasetItem & { hasData: boolean }>> {
  const dates = getUniqueDatesFromSource(source, dateKey);

  const repoMap = new Map<string, (number | null)[]>();

  dates.forEach((date, dateIndex) => {
    const results = getClosedPrPercentageByRepoUntilDate(source, date, {
      scoreBounds,
    });

    results.forEach((result) => {
      if (!repoMap.has(result.repo)) {
        repoMap.set(result.repo, Array(dates.length).fill(null));
      }
      const series = repoMap.get(result.repo);
      if (!series) return;
      series[dateIndex] = result.elligiblePrs > 0 ? result.percentage : null;
    });
  });

  return Array.from(repoMap.entries()).map(([name, series]) => [
    {
      name,
      series,
      type: "line",
      smooth: true,
      hasData: series.some((value) => value !== null),
    },
  ]);
}
