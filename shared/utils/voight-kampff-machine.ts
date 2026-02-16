import type { GitHubEvent, GitHubUser } from "../types/github";
import { CONFIG } from "./score-config";

export interface IdentifyReplicantResult {
  score: number;
  classification: "human" | "suspicious" | "likely_bot";
  flags: Array<{ label: string; points: number; detail: string }>;
  profile: {
    age: number;
    followers: number;
    repos: number;
    hasIdentity: boolean;
  };
}

export function identifyReplicant(
  user: GitHubUser,
  events: GitHubEvent[],
): IdentifyReplicantResult {
  const flags: Array<{ label: string; points: number; detail: string }> = [];
  let score = 0;

  // Coding event types used throughout (commits and PRs)
  const codingEventTypes = new Set(["PushEvent", "PullRequestEvent"]);

  // Account age
  const ageMs = Date.now() - new Date(user.created_at).getTime();
  const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays < CONFIG.AGE_NEW_ACCOUNT) {
    score += CONFIG.POINTS_NEW_ACCOUNT;
    flags.push({
      label: "Recently created",
      points: CONFIG.POINTS_NEW_ACCOUNT,
      detail: `Account is ${ageDays} days old`,
    });
  } else if (ageDays < CONFIG.AGE_YOUNG_ACCOUNT) {
    score += CONFIG.POINTS_YOUNG_ACCOUNT;
    flags.push({
      label: "Young account",
      points: CONFIG.POINTS_YOUNG_ACCOUNT,
      detail: `Account is ${ageDays} days old`,
    });
  }

  // No identity (no name AND no bio)
  const hasIdentity = !!(user.name || user.bio);
  if (!hasIdentity) {
    score += CONFIG.POINTS_NO_IDENTITY;
    flags.push({
      label: "Minimal profile",
      points: CONFIG.POINTS_NO_IDENTITY,
      detail: "No name or bio provided",
    });
  }

  // Zero personal repos and all activity is external
  const foreignEvents = events.filter((e) => {
    const repoOwner = e.repo?.name.split("/")[0]?.toLowerCase();
    return repoOwner && repoOwner !== user.login.toLowerCase();
  });
  const allExternal =
    user.public_repos === 0 && foreignEvents.length === events.length;
  if (allExternal && events.length >= CONFIG.ZERO_REPOS_MIN_EVENTS) {
    score +=
      CONFIG.POINTS_ZERO_REPOS_ACTIVE + CONFIG.POINTS_NO_PERSONAL_ACTIVITY;
    flags.push({
      label: "Only active on other people's repos",
      points:
        CONFIG.POINTS_ZERO_REPOS_ACTIVE + CONFIG.POINTS_NO_PERSONAL_ACTIVITY,
      detail: `No personal repos, all ${events.length} events are on repos they don't own`,
    });
  }

  // Coding activity density (split PRs and commits)
  // Only flag for new/young accounts - established accounts often have burst activity
  const isNewOrYoungAccount = ageDays < CONFIG.AGE_YOUNG_ACCOUNT;
  if (isNewOrYoungAccount && events.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
    const commitEvents = events.filter((e) => e.type === "PushEvent");
    const prEvents = events.filter((e) => e.type === "PullRequestEvent");
    // Commits
    if (commitEvents.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
      const timestamps = commitEvents.map((e) =>
        new Date(e.created_at).getTime(),
      );
      const oldestEvent = Math.min(...timestamps);
      const newestEvent = Math.max(...timestamps);
      const eventSpanDays = Math.max(
        1,
        Math.round((newestEvent - oldestEvent) / (1000 * 60 * 60 * 24)),
      );
      const commitsPerDay = commitEvents.length / eventSpanDays;
      if (commitsPerDay >= CONFIG.ACTIVITY_DENSITY_EXTREME) {
        score += CONFIG.POINTS_EXTREME_ACTIVITY_DENSITY;
        flags.push({
          label: "Very high commit rate",
          points: CONFIG.POINTS_EXTREME_ACTIVITY_DENSITY,
          detail: `${commitEvents.length} commits in ${eventSpanDays} day${eventSpanDays === 1 ? "" : "s"}`,
        });
      } else if (commitsPerDay >= CONFIG.ACTIVITY_DENSITY_HIGH) {
        score += CONFIG.POINTS_HIGH_ACTIVITY_DENSITY;
        flags.push({
          label: "High commit rate",
          points: CONFIG.POINTS_HIGH_ACTIVITY_DENSITY,
          detail: `${commitEvents.length} commits in ${eventSpanDays} day${eventSpanDays === 1 ? "" : "s"}`,
        });
      }
    }
    // PRs (flag more aggressively)
    if (prEvents.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
      const timestamps = prEvents.map((e) => new Date(e.created_at).getTime());
      const oldestEvent = Math.min(...timestamps);
      const newestEvent = Math.max(...timestamps);
      const eventSpanDays = Math.max(
        1,
        Math.round((newestEvent - oldestEvent) / (1000 * 60 * 60 * 24)),
      );
      const prsPerDay = prEvents.length / eventSpanDays;
      if (prsPerDay >= CONFIG.ACTIVITY_DENSITY_EXTREME / 2) {
        // PRs are much rarer
        score += CONFIG.POINTS_EXTREME_ACTIVITY_DENSITY + 10;
        flags.push({
          label: "Extremely high PR rate",
          points: CONFIG.POINTS_EXTREME_ACTIVITY_DENSITY + 10,
          detail: `${prEvents.length} PRs in ${eventSpanDays} day${eventSpanDays === 1 ? "" : "s"}`,
        });
      } else if (prsPerDay >= CONFIG.ACTIVITY_DENSITY_HIGH / 2) {
        score += CONFIG.POINTS_HIGH_ACTIVITY_DENSITY + 5;
        flags.push({
          label: "High PR rate",
          points: CONFIG.POINTS_HIGH_ACTIVITY_DENSITY + 5,
          detail: `${prEvents.length} PRs in ${eventSpanDays} day${eventSpanDays === 1 ? "" : "s"}`,
        });
      }
    }
  }

  // Low followers relative to following (follow bots)
  if (
    user.following > CONFIG.FOLLOW_RATIO_FOLLOWING_MIN &&
    user.followers < CONFIG.FOLLOW_RATIO_FOLLOWERS_MAX
  ) {
    score += CONFIG.POINTS_FOLLOW_RATIO;
    flags.push({
      label: "Unusual follow ratio",
      points: CONFIG.POINTS_FOLLOW_RATIO,
      detail: `Following ${user.following} but only ${user.followers} followers`,
    });
  } else if (user.followers === 0 && user.following > 0) {
    score += CONFIG.POINTS_ZERO_FOLLOWERS;
    flags.push({
      label: "No followers yet",
      points: CONFIG.POINTS_ZERO_FOLLOWERS,
      detail: "Account has no followers",
    });
  }

  if (events.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
    const timestamps = events.map((e) => new Date(e.created_at));
    const userLogin = user.login.toLowerCase();

    // Reuse codingEventTypes from above, but include reviews for marathon check
    const codingEventsWithReviews = events.filter(
      (e) =>
        codingEventTypes.has(e.type) ||
        e.type === "PullRequestReviewEvent" ||
        e.type === "PullRequestReviewCommentEvent",
    );

    // Fork surge
    // AI agents fork lots of repos to contribute
    const forkEvents = events.filter((e) => e.type === "ForkEvent");
    if (forkEvents.length >= CONFIG.FORKS_EXTREME) {
      score += CONFIG.POINTS_FORK_SURGE;
      flags.push({
        label: "Many recent forks",
        points: CONFIG.POINTS_FORK_SURGE,
        detail: `${forkEvents.length} repos forked recently`,
      });
    } else if (forkEvents.length >= CONFIG.FORKS_HIGH) {
      score += CONFIG.POINTS_MULTIPLE_FORKS;
      flags.push({
        label: "Multiple forks",
        points: CONFIG.POINTS_MULTIPLE_FORKS,
        detail: `${forkEvents.length} repos forked recently`,
      });
    }

    // Inhuman daily coding activity
    // many hours of coding in a day, happening day after day
    const codingEventsByDay = new Map<string, Date[]>();
    codingEventsWithReviews.forEach((e) => {
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
        const prev = new Date(daysWithManyHours[i - 1]!);
        const curr = new Date(daysWithManyHours[i]!);
        const diffDays =
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          consecutiveCount++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
        } else {
          consecutiveCount = 1;
        }
      }

      // Consecutive marathon days = definitely not human or really needs to touch grass
      if (maxConsecutive >= CONFIG.CONSECUTIVE_INHUMAN_DAYS_EXTREME) {
        score += CONFIG.POINTS_NONSTOP_ACTIVITY;
        flags.push({
          label: "Extended daily coding",
          points: CONFIG.POINTS_NONSTOP_ACTIVITY,
          detail: `${maxConsecutive} days in a row with ${CONFIG.HOURS_PER_DAY_INHUMAN}+ hours of coding`,
        });
      } else if (daysWithManyHours.length >= CONFIG.FREQUENT_MARATHON_DAYS) {
        score += CONFIG.POINTS_FREQUENT_MARATHON;
        flags.push({
          label: "Frequent long coding days",
          points: CONFIG.POINTS_FREQUENT_MARATHON,
          detail: `${daysWithManyHours.length} days with ${CONFIG.HOURS_PER_DAY_INHUMAN}+ hours of coding each`,
        });
      }
    }

    // 3. Consecutive days activity
    // working non-stop
    const daySet = new Set<string>();
    timestamps.forEach((t) => daySet.add(t.toISOString().slice(0, 10)));
    const sortedDays = [...daySet].sort();

    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]!);
      const curr = new Date(sortedDays[i]!);
      const diffDays =
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    if (maxStreak >= CONFIG.CONSECUTIVE_DAYS_STREAK) {
      score += CONFIG.POINTS_CONTINUOUS_ACTIVITY;
      flags.push({
        label: "Long activity streak",
        points: CONFIG.POINTS_CONTINUOUS_ACTIVITY,
        detail: `${maxStreak} days in a row with activity`,
      });
    }

    // 4. External repo spread
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
        score += CONFIG.POINTS_EXTREME_REPO_SPREAD_YOUNG;
        flags.push({
          label: "Very wide contribution spread",
          points: CONFIG.POINTS_EXTREME_REPO_SPREAD_YOUNG,
          detail: `Active in ${externalRepos.size} repos they don't own`,
        });
      } else if (externalRepos.size >= CONFIG.REPO_SPREAD_HIGH) {
        score += CONFIG.POINTS_WIDE_REPO_SPREAD_YOUNG;
        flags.push({
          label: "Wide contribution spread",
          points: CONFIG.POINTS_WIDE_REPO_SPREAD_YOUNG,
          detail: `Active in ${externalRepos.size} repos they don't own`,
        });
      }
    }

    // 5. External PRs
    // check frequency, not just total
    const prEvents = events.filter((e) => e.type === "PullRequestEvent");
    const externalPRs = prEvents.filter((e) => {
      const repoOwner = e.repo?.name.split("/")[0]?.toLowerCase();
      return repoOwner && repoOwner !== userLogin;
    });

    // Group PRs by day and week
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const prsThisWeek = externalPRs.filter(
      (e) => new Date(e.created_at).getTime() > oneWeekAgo,
    );
    const prsToday = externalPRs.filter(
      (e) => new Date(e.created_at).getTime() > oneDayAgo,
    );

    // Many PRs in a single day
    // only flag extreme cases
    if (prsToday.length >= CONFIG.PRS_TODAY_EXTREME) {
      score += CONFIG.POINTS_PR_BURST;
      flags.push({
        label: "High PR volume today",
        points: CONFIG.POINTS_PR_BURST,
        detail: `${prsToday.length} PRs to other repos in the last 24 hours`,
      });
    } else if (prsThisWeek.length >= CONFIG.PRS_WEEK_HIGH) {
      // Many PRs in a week
      score += CONFIG.POINTS_HIGH_PR_FREQUENCY;
      flags.push({
        label: "High PR volume this week",
        points: CONFIG.POINTS_HIGH_PR_FREQUENCY,
        detail: `${prsThisWeek.length} PRs to other repos this week`,
      });
    }

    // Also flag if lots of PRs AND few personal repos (regardless of time)
    if (
      externalPRs.length >= CONFIG.EXTERNAL_PRS_MIN &&
      user.public_repos < CONFIG.PERSONAL_REPOS_LOW
    ) {
      score += CONFIG.POINTS_PR_ONLY_CONTRIBUTOR;

      let detail = `${externalPRs.length} PRs to other repos, but only ${user.public_repos} of their own`;
      if (user.public_repos === 0) {
        detail = `${externalPRs.length} PRs to other repos, none of their own`;
      }

      flags.push({
        label: "Primarily external contributions",
        points: CONFIG.POINTS_PR_ONLY_CONTRIBUTOR,
        detail,
      });
    }

    // 6. Mostly external activity (not 100%)
    const foreignRatio = foreignEvents.length / events.length;
    if (
      !allExternal &&
      foreignRatio >= CONFIG.FOREIGN_RATIO_HIGH &&
      user.public_repos < CONFIG.PERSONAL_REPOS_LOW
    ) {
      score += CONFIG.POINTS_EXTERNAL_FOCUS;
      flags.push({
        label: "Mostly external activity",
        points: CONFIG.POINTS_EXTERNAL_FOCUS,
        detail: `${Math.round(foreignRatio * 100)}% of activity on other people's repos`,
      });
    }
  }

  // Invert score: 100 = human, 0 = bot
  const humanScore = Math.max(0, 100 - score);

  // Classification based on inverted score
  let classification: "human" | "suspicious" | "likely_bot" = "likely_bot";
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
      age: ageDays,
      followers: user.followers,
      repos: user.public_repos,
      hasIdentity,
    },
  };
}
