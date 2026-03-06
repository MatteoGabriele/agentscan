import { CONFIG } from "./config";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax.js";
import type {
  IdentifyFlag,
  IdentifyReplicantOptions,
  IdentifyReplicantResult,
  IdentityClassification,
} from "~~/shared/types/identity";

dayjs.extend(minMax);

export function identifyReplicant({
  createdAt,
  reposCount,
  accountName,
  events,
}: IdentifyReplicantOptions): IdentifyReplicantResult {
  const flags: IdentifyFlag[] = [];

  const accountAge = dayjs().diff(createdAt, "days");

  if (accountAge < CONFIG.AGE_NEW_ACCOUNT) {
    flags.push({
      label: "Recently created",
      points: CONFIG.POINTS_NEW_ACCOUNT,
      detail: `Account is ${accountAge} days old`,
    });
  } else if (accountAge < CONFIG.AGE_YOUNG_ACCOUNT) {
    flags.push({
      label: "Young account",
      points: CONFIG.POINTS_YOUNG_ACCOUNT,
      detail: `Account is ${accountAge} days old`,
    });
  }

  const foreignEvents = events.filter((e) => {
    const repoOwner = e.repo?.name.split("/")[0]?.toLowerCase();
    return repoOwner && repoOwner !== accountName.toLowerCase();
  });

  const hasAllExternal =
    reposCount === 0 && foreignEvents.length === events.length;

  if (hasAllExternal && events.length >= CONFIG.ZERO_REPOS_MIN_EVENTS) {
    flags.push({
      label: "Only active on other people's repos",
      points:
        CONFIG.POINTS_ZERO_REPOS_ACTIVE + CONFIG.POINTS_NO_PERSONAL_ACTIVITY,
      detail: `No personal repos, all ${events.length} events are on repos they don't own`,
    });
  }

  const isNewOrYoungAccount = accountAge < CONFIG.AGE_YOUNG_ACCOUNT;

  // Behavioral pattern checks (apply to all accounts regardless of age)
  if (events.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
    const createEvents = events.filter((e) => e.type === "CreateEvent");

    // Rapid repo creation burst (CreateEvent clustering)
    if (createEvents.length >= CONFIG.CREATE_EVENTS_MIN) {
      const createTimestamps = createEvents
        .map((e) => dayjs(e.created_at))
        .sort((a, b) => a.valueOf() - b.valueOf());

      // Check for repo creation clustering (multiple repos in short time window)
      let maxCreatesInWindow = 0;
      let windowStartIdx = 0;

      for (let endIdx = 0; endIdx < createTimestamps.length; endIdx++) {
        const windowEnd = createTimestamps[endIdx];

        // Slide window to include only events within 24 hours
        while (
          windowEnd &&
          windowEnd.diff(createTimestamps[windowStartIdx], "hour", true) > 24
        ) {
          windowStartIdx++;
        }

        const createsInWindow = endIdx - windowStartIdx + 1;
        maxCreatesInWindow = Math.max(maxCreatesInWindow, createsInWindow);
      }

      if (maxCreatesInWindow >= CONFIG.CREATE_BURST_EXTREME) {
        flags.push({
          label: "Concentrated repository creation activity",
          points: CONFIG.POINTS_CREATE_BURST_EXTREME,
          detail: `${maxCreatesInWindow} repositories created in a short timeframe (within 24 hours)`,
        });
      } else if (maxCreatesInWindow >= CONFIG.CREATE_BURST_HIGH) {
        flags.push({
          label: "Frequent repository creation",
          points: CONFIG.POINTS_CREATE_BURST_HIGH,
          detail: `${maxCreatesInWindow} repositories created in a short timeframe (within 24 hours)`,
        });
      }
    }

    // 24/7 activity pattern (no sleep, bot-like consistency) - IMPROVED
    const activityByHour = new Map<number, number>();
    events.forEach((e) => {
      const hour = dayjs(e.created_at).hour();
      activityByHour.set(hour, (activityByHour.get(hour) || 0) + 1);
    });

    if (events.length > 0 && activityByHour.size > 0) {
      const activeHours = activityByHour.size;
      const eventCounts = Array.from(activityByHour.values());
      const avgEventsPerHour = events.length / activeHours;

      // Calculate standard deviation to detect uniform distribution
      const mean = avgEventsPerHour;
      const variance =
        eventCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
        eventCounts.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // Find largest rest gap (sleep window) - accounts for midnight wrap
      const sortedHours = Array.from(activityByHour.keys()).sort(
        (a, b) => a - b,
      );
      const firstHour = sortedHours[0];
      const lastHour = sortedHours[sortedHours.length - 1];
      let maxRestGap =
        firstHour !== undefined && lastHour !== undefined
          ? 24 - lastHour + firstHour
          : 0;
      for (let i = 0; i < sortedHours.length - 1; i++) {
        const currentHour = sortedHours[i];
        const nextHour = sortedHours[i + 1];
        if (currentHour !== undefined && nextHour !== undefined) {
          maxRestGap = Math.max(maxRestGap, nextHour - currentHour - 1);
        }
      }

      // Bot-like patterns: suspicious uniform distribution OR no realistic rest window
      const isSuspiciouslyUniform = coefficientOfVariation < 0.3;
      const hasMinimalRest = maxRestGap < 3;
      const meetsEventThreshold =
        avgEventsPerHour >= CONFIG.EVENTS_PER_HOUR_MIN;

      if (
        activeHours >= CONFIG.HOURS_ACTIVE_EXTREME &&
        meetsEventThreshold &&
        (isSuspiciouslyUniform || hasMinimalRest)
      ) {
        let points: number = CONFIG.POINTS_24_7_ACTIVITY;
        // Increase severity if both uniform AND minimal rest
        if (isSuspiciouslyUniform && hasMinimalRest) {
          points = Math.round(points * 1.5);
        }

        flags.push({
          label: "24/7 activity pattern",
          points,
          detail: `Active ${activeHours}/24 hours, ${maxRestGap}h max rest, ${avgEventsPerHour.toFixed(1)} events/hour`,
        });
      }
    }
    // Event type diversity check (bots often have limited activity types)
    const eventTypes = new Set(events.map((e) => e.type));
    const hasInteraction =
      eventTypes.has("IssueCommentEvent") ||
      eventTypes.has("PullRequestReviewEvent") ||
      eventTypes.has("PullRequestReviewCommentEvent");
    const hasWatches = eventTypes.has("WatchEvent");

    // Pure automation indicator: only create/push events, no human interaction
    if (
      eventTypes.size <= CONFIG.EVENT_TYPE_DIVERSITY_MIN &&
      !hasInteraction &&
      !hasWatches
    ) {
      flags.push({
        label: "Narrow activity focus",
        points: CONFIG.POINTS_LOW_DIVERSITY,
        detail: `Activity concentrated on ${eventTypes.size} specific event types without interpersonal interactions`,
      });
    }
  }

  // Additional checks for young accounts (more strict thresholds)
  if (isNewOrYoungAccount && events.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
    const userLogin = accountName.toLowerCase();

    const commitEvents = events.filter((e) => e.type === "PushEvent");

    if (commitEvents.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
      const timestamps = commitEvents
        .map((e) => dayjs(e.created_at))
        .sort((a, b) => a.valueOf() - b.valueOf());

      let maxCommitsInHour = 0;
      let windowStartIndex = 0;

      for (
        let windowEndIndex = 0;
        windowEndIndex < timestamps.length;
        windowEndIndex++
      ) {
        const windowEnd = timestamps[windowEndIndex];

        // Slide window start forward until within 1 hour
        while (
          windowEnd &&
          windowEnd.diff(timestamps[windowStartIndex], "hour", true) > 1
        ) {
          windowStartIndex++;
        }

        const commitsInWindow = windowEndIndex - windowStartIndex + 1;
        maxCommitsInHour = Math.max(maxCommitsInHour, commitsInWindow);
      }

      if (maxCommitsInHour >= CONFIG.HOURLY_ACTIVITY_EXTREME) {
        flags.push({
          label: "Extreme commit burst",
          points: CONFIG.POINTS_EXTREME_ACTIVITY_DENSITY,
          detail: `${maxCommitsInHour} commits within 1 hour`,
        });
      } else if (maxCommitsInHour >= CONFIG.HOURLY_ACTIVITY_HIGH) {
        flags.push({
          label: "High commit burst",
          points: CONFIG.POINTS_HIGH_ACTIVITY_DENSITY,
          detail: `${maxCommitsInHour} commits within 1 hour`,
        });
      }

      // Detect ultra-tight bursts (e.g., 3+ commits within 10 seconds)
      let tightBurstCount = 0;

      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] !== undefined && timestamps[i - 1] !== undefined) {
          const diffSeconds = timestamps[i]!.diff(timestamps[i - 1]!, "second");

          if (diffSeconds <= CONFIG.TIGHT_COMMIT_SECONDS) {
            tightBurstCount++;
          }
        }
      }

      if (tightBurstCount >= CONFIG.TIGHT_COMMIT_THRESHOLD) {
        flags.push({
          label: "High commit frequency",
          points: CONFIG.POINTS_TIGHT_BURST,
          detail: `${tightBurstCount + 1} commits within very short intervals`,
        });
      }
    }

    // PRs (flag more aggressively)
    const prEvents = events.filter((e) => e.type === "PullRequestEvent");

    if (prEvents.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
      const timestamps = prEvents.map((e) => dayjs(e.created_at));
      const oldestEvent = dayjs.min(timestamps);
      const newestEvent = dayjs.max(timestamps);

      if (newestEvent) {
        const eventSpanDays = Math.max(1, newestEvent.diff(oldestEvent, "day"));
        const prsPerDay = prEvents.length / eventSpanDays;

        if (prsPerDay >= CONFIG.ACTIVITY_DENSITY_EXTREME / 2) {
          // PRs are much rarer
          flags.push({
            label: "Very high PR volume",
            points: CONFIG.POINTS_EXTREME_ACTIVITY_DENSITY + 10,
            detail: `${prEvents.length} PRs in ${eventSpanDays} day${eventSpanDays === 1 ? "" : "s"}`,
          });
        } else if (prsPerDay >= CONFIG.ACTIVITY_DENSITY_HIGH / 2) {
          flags.push({
            label: "High PR volume",
            points: CONFIG.POINTS_HIGH_ACTIVITY_DENSITY + 5,
            detail: `${prEvents.length} PRs in ${eventSpanDays} day${eventSpanDays === 1 ? "" : "s"}`,
          });
        }
      }
    }

    // Fork surge
    // AI agents fork lots of repos to contribute
    const forkEvents = events.filter((e) => e.type === "ForkEvent");
    if (forkEvents.length >= CONFIG.FORKS_EXTREME) {
      flags.push({
        label: "Many recent forks",
        points: CONFIG.POINTS_FORK_SURGE,
        detail: `${forkEvents.length} repos forked recently`,
      });
    } else if (forkEvents.length >= CONFIG.FORKS_HIGH) {
      flags.push({
        label: "Multiple forks",
        points: CONFIG.POINTS_MULTIPLE_FORKS,
        detail: `${forkEvents.length} repos forked recently`,
      });
    }

    const codingEventTypes = new Set(["PushEvent", "PullRequestEvent"]);
    const codingEventsWithReviews = events.filter(
      (e) =>
        (e.type && codingEventTypes.has(e.type)) ||
        e.type === "PullRequestReviewEvent" ||
        e.type === "PullRequestReviewCommentEvent",
    );

    // Inhuman daily coding activity
    // many hours of coding in a day, happening day after day
    const codingEventsByDay = new Map<string, Date[]>();
    codingEventsWithReviews.forEach((e) => {
      if (!e.created_at) {
        return;
      }

      const t = new Date(e.created_at);
      const day = t.toISOString().slice(0, 10);
      if (!codingEventsByDay.has(day)) codingEventsByDay.set(day, []);
      codingEventsByDay.get(day)!.push(t);
    });

    // For each day, count unique hours with coding activity
    // Too many unique hours in a day = inhuman/unhealthy
    const daysWithManyHours: string[] = [];
    codingEventsByDay.forEach((dayTimestamps, day) => {
      const uniqueHours = new Set(dayTimestamps.map((t) => t.getUTCHours()));
      if (uniqueHours.size >= CONFIG.HOURS_PER_DAY_INHUMAN) {
        daysWithManyHours.push(day);
      }
    });

    // Check if these inhuman days are consecutive
    if (daysWithManyHours.length >= CONFIG.CONSECUTIVE_INHUMAN_DAYS_EXTREME) {
      daysWithManyHours.sort();
      let consecutiveCount = 1;
      let maxConsecutive = 1;
      for (let i = 1; i < daysWithManyHours.length; i++) {
        const prev = dayjs(daysWithManyHours[i - 1]);
        const curr = dayjs(daysWithManyHours[i]);
        const diffDays = curr.diff(prev, "day");

        if (diffDays === 1) {
          consecutiveCount++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
        } else {
          consecutiveCount = 1;
        }
      }

      // Consecutive marathon days = definitely not human or really needs to touch grass
      if (maxConsecutive >= CONFIG.CONSECUTIVE_INHUMAN_DAYS_EXTREME) {
        flags.push({
          label: "Extended daily coding",
          points: CONFIG.POINTS_NONSTOP_ACTIVITY,
          detail: `${maxConsecutive} days in a row with ${CONFIG.HOURS_PER_DAY_INHUMAN}+ hours of coding`,
        });
      } else if (daysWithManyHours.length >= CONFIG.FREQUENT_MARATHON_DAYS) {
        flags.push({
          label: "Frequent long coding days",
          points: CONFIG.POINTS_FREQUENT_MARATHON,
          detail: `${daysWithManyHours.length} days with ${CONFIG.HOURS_PER_DAY_INHUMAN}+ hours of coding each`,
        });
      }
    }

    // Consecutive days activity
    // working non-stop
    const daySet = new Set<string>();
    events.forEach((e) => {
      daySet.add(dayjs(e.created_at).format("YYYY-MM-DD"));
    });

    const sortedDays = Array.from(daySet)
      .map((d) => dayjs(d, "YYYY-MM-DD"))
      .sort((a, b) => a.valueOf() - b.valueOf());

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = sortedDays[i - 1];
      const curr = sortedDays[i];

      if (curr && prev && curr.diff(prev, "day") === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    if (maxStreak >= CONFIG.CONSECUTIVE_DAYS_STREAK) {
      flags.push({
        label: "Long activity streak",
        points: CONFIG.POINTS_CONTINUOUS_ACTIVITY,
        detail: `${maxStreak} days in a row with activity`,
      });
    }

    // External repo spread
    // Only count repos the user doesn't own
    // Only flag for young accounts - established OSS devs often contribute widely
    if (isNewOrYoungAccount) {
      const externalRepos = new Set(
        events
          .map((e) => e.repo?.name)
          .filter((name): name is string => {
            if (!name) return false;
            const repoOwner = name.split("/")[0]?.toLowerCase();
            return repoOwner !== userLogin;
          }),
      );

      if (externalRepos.size >= CONFIG.REPO_SPREAD_EXTREME) {
        flags.push({
          label: "Highly distributed activity",
          points: CONFIG.POINTS_EXTREME_REPO_SPREAD_YOUNG,
          detail: `Activity spread across ${externalRepos.size} external repositories`,
        });
      } else if (externalRepos.size >= CONFIG.REPO_SPREAD_HIGH) {
        flags.push({
          label: "Distributed activity",
          points: CONFIG.POINTS_WIDE_REPO_SPREAD_YOUNG,
          detail: `Activity spread across ${externalRepos.size} external repositories`,
        });
      }
    }

    // External PRs
    // check frequency, not just total
    const externalPRs = prEvents.filter((e) => {
      const repoOwner = e.repo?.name.split("/")[0]?.toLowerCase();
      return repoOwner && repoOwner !== userLogin;
    });

    // Group PRs by day and week
    const now = dayjs();
    const oneWeekAgo = now.subtract(1, "week");
    const oneDayAgo = now.subtract(1, "day");

    const prsThisWeek = externalPRs.filter((e) =>
      dayjs(e.created_at).isAfter(oneWeekAgo),
    );
    const prsToday = externalPRs.filter((e) =>
      dayjs(e.created_at).isAfter(oneDayAgo),
    );

    // Many PRs in a single day
    // only flag extreme cases
    if (prsToday.length >= CONFIG.PRS_TODAY_EXTREME) {
      flags.push({
        label: "High PR volume in the past 24 hours",
        points: CONFIG.POINTS_PR_BURST,
        detail: `${prsToday.length} PRs to other repos in the last 24 hours`,
      });
    } else if (prsThisWeek.length >= CONFIG.PRS_WEEK_HIGH) {
      // Many PRs in a week
      flags.push({
        label: "High PR volume during last week",
        points: CONFIG.POINTS_HIGH_PR_FREQUENCY,
        detail: `${prsThisWeek.length} PRs to other repos this week`,
      });
    }

    // Also flag if lots of PRs AND few personal repos (regardless of time)
    if (
      externalPRs.length >= CONFIG.EXTERNAL_PRS_MIN &&
      reposCount < CONFIG.PERSONAL_REPOS_LOW
    ) {
      let detail = `${externalPRs.length} PRs to other repos, but only ${reposCount} of their own`;
      if (reposCount === 0) {
        detail = `${externalPRs.length} PRs to other repos, none of their own`;
      }

      flags.push({
        label: "Primarily external contributions",
        points: CONFIG.POINTS_PR_ONLY_CONTRIBUTOR,
        detail,
      });
    }

    // Mostly external activity (not 100%)
    const foreignRatio = foreignEvents.length / events.length;
    if (
      !hasAllExternal &&
      foreignRatio >= CONFIG.FOREIGN_RATIO_HIGH &&
      reposCount < CONFIG.PERSONAL_REPOS_LOW
    ) {
      flags.push({
        label: "Mostly external activity",
        points: CONFIG.POINTS_EXTERNAL_FOCUS,
        detail: `${Math.round(foreignRatio * 100)}% of activity on other people's repos`,
      });
    }
  }

  // Invert score: 100 = human, 0 = bot
  const score = flags.reduce((total, flag) => (total += flag.points), 0);
  const humanScore = Math.max(0, 100 - score);

  // Classification based on inverted score
  let classification: IdentityClassification = "likely_bot";
  if (humanScore >= CONFIG.THRESHOLD_HUMAN) {
    classification = "human";
  } else if (humanScore >= CONFIG.THRESHOLD_SUSPICIOUS) {
    classification = "suspicious";
  }

  return {
    score: humanScore,
    classification,
    flags,
    profile: {
      age: accountAge,
      repos: reposCount,
    },
  };
}
