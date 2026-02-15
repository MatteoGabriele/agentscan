import { CONFIG } from "~~/shared/utils/score-config";

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubEvent {
  type: string;
  created_at: string;
  repo?: { name: string };
  payload?: {
    commits?: Array<{ message: string }>;
    pull_request?: { title: string; body: string | null };
    issue?: { title: string; body: string | null };
  };
}

export interface AnalysisResult {
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

export function analyzeUser(
  user: GitHubUser,
  events: GitHubEvent[],
): AnalysisResult {
  const flags: Array<{ label: string; points: number; detail: string }> = [];
  let score = 0;

  // Account age
  const ageMs = Date.now() - new Date(user.created_at).getTime();
  const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays < CONFIG.AGE_NEW_ACCOUNT) {
    score += CONFIG.POINTS_NEW_ACCOUNT;
    flags.push({
      label: "New Account",
      points: CONFIG.POINTS_NEW_ACCOUNT,
      detail: `${ageDays} days old`,
    });
  } else if (ageDays < CONFIG.AGE_YOUNG_ACCOUNT) {
    score += CONFIG.POINTS_YOUNG_ACCOUNT;
    flags.push({
      label: "Young Account",
      points: CONFIG.POINTS_YOUNG_ACCOUNT,
      detail: `${ageDays} days old`,
    });
  }

  // No identity (no name AND no bio)
  const hasIdentity = !!(user.name || user.bio);
  if (!hasIdentity) {
    score += CONFIG.POINTS_NO_IDENTITY;
    flags.push({
      label: "No Identity",
      points: CONFIG.POINTS_NO_IDENTITY,
      detail: "Missing name and bio",
    });
  }

  // Low followers relative to following (follow bots)
  if (
    user.following > CONFIG.FOLLOW_RATIO_FOLLOWING_MIN &&
    user.followers < CONFIG.FOLLOW_RATIO_FOLLOWERS_MAX
  ) {
    score += CONFIG.POINTS_FOLLOW_RATIO;
    flags.push({
      label: "Follow Ratio",
      points: CONFIG.POINTS_FOLLOW_RATIO,
      detail: `${user.followers} followers, ${user.following} following`,
    });
  } else if (user.followers === 0 && user.following > 0) {
    score += CONFIG.POINTS_ZERO_FOLLOWERS;
    flags.push({
      label: "Zero Followers",
      points: CONFIG.POINTS_ZERO_FOLLOWERS,
      detail: "No followers yet",
    });
  }

  if (events.length >= CONFIG.MIN_EVENTS_FOR_ANALYSIS) {
    const timestamps = events.map((e) => new Date(e.created_at));
    const userLogin = user.login.toLowerCase();

    // Fork surge
    // AI agents fork lots of repos to contribute
    const forkEvents = events.filter((e) => e.type === "ForkEvent");
    if (forkEvents.length >= CONFIG.FORKS_EXTREME) {
      score += CONFIG.POINTS_FORK_SURGE;
      flags.push({
        label: "Fork Surge",
        points: CONFIG.POINTS_FORK_SURGE,
        detail: `${forkEvents.length} repos forked recently`,
      });
    } else if (forkEvents.length >= CONFIG.FORKS_HIGH) {
      score += CONFIG.POINTS_MULTIPLE_FORKS;
      flags.push({
        label: "Multiple Forks",
        points: CONFIG.POINTS_MULTIPLE_FORKS,
        detail: `${forkEvents.length} repos forked recently`,
      });
    }

    // Inhuman daily activity
    // many hours in a day, happening day after day
    const eventsByDay = new Map<string, Date[]>();
    timestamps.forEach((t) => {
      const day = t.toISOString().slice(0, 10);
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day)!.push(t);
    });

    // For each day, count unique hours with activity (not just span)
    // Too many unique hours in a day = inhuman/unhealthy
    const daysWithManyHours: string[] = [];
    eventsByDay.forEach((dayTimestamps, day) => {
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
          label: "Nonstop Activity",
          points: CONFIG.POINTS_NONSTOP_ACTIVITY,
          detail: `${maxConsecutive} consecutive days with ${CONFIG.HOURS_PER_DAY_INHUMAN}+ hours of activity`,
        });
      } else if (daysWithManyHours.length >= CONFIG.FREQUENT_MARATHON_DAYS) {
        score += CONFIG.POINTS_FREQUENT_MARATHON;
        flags.push({
          label: "Frequent Marathon Days",
          points: CONFIG.POINTS_FREQUENT_MARATHON,
          detail: `${daysWithManyHours.length} days with ${CONFIG.HOURS_PER_DAY_INHUMAN}+ hours of activity`,
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
        label: "Continuous Activity",
        points: CONFIG.POINTS_CONTINUOUS_ACTIVITY,
        detail: `${maxStreak} consecutive days of activity`,
      });
    }

    // 4. Repo spread
    // Extremely wide spread is suspicious
    const uniqueRepos = new Set(
      events.map((e) => e.repo?.name).filter(Boolean),
    );
    if (uniqueRepos.size >= CONFIG.REPO_SPREAD_EXTREME) {
      score += CONFIG.POINTS_EXTREME_REPO_SPREAD;
      flags.push({
        label: "Extreme Repo Spread",
        points: CONFIG.POINTS_EXTREME_REPO_SPREAD,
        detail: `Active in ${uniqueRepos.size} different repos`,
      });
    } else if (uniqueRepos.size >= CONFIG.REPO_SPREAD_HIGH) {
      score += CONFIG.POINTS_WIDE_REPO_SPREAD;
      flags.push({
        label: "Wide Repo Spread",
        points: CONFIG.POINTS_WIDE_REPO_SPREAD,
        detail: `Active in ${uniqueRepos.size} different repos`,
      });
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
        label: "PR Burst",
        points: CONFIG.POINTS_PR_BURST,
        detail: `${prsToday.length} external PRs in 24 hours`,
      });
    } else if (prsThisWeek.length >= CONFIG.PRS_WEEK_HIGH) {
      // Many PRs in a week
      score += CONFIG.POINTS_HIGH_PR_FREQUENCY;
      flags.push({
        label: "High PR Frequency",
        points: CONFIG.POINTS_HIGH_PR_FREQUENCY,
        detail: `${prsThisWeek.length} external PRs in 7 days`,
      });
    }

    // Also flag if lots of PRs AND few personal repos (regardless of time)
    if (
      externalPRs.length >= CONFIG.EXTERNAL_PRS_MIN &&
      user.public_repos < CONFIG.PERSONAL_REPOS_LOW
    ) {
      score += CONFIG.POINTS_PR_ONLY_CONTRIBUTOR;

      let detail = `${externalPRs.length} external PRs but only ${user.public_repos} personal repos`;
      if (user.public_repos === 0) {
        detail = `${externalPRs.length} external PRs and no personal repos`;
      }

      flags.push({
        label: "PR-Only Contributor",
        points: CONFIG.POINTS_PR_ONLY_CONTRIBUTOR,
        detail,
      });
    }

    // 6. Full external activity with no personal repos = almost certain bot
    const foreignEvents = events.filter((e) => {
      const repoOwner = e.repo?.name.split("/")[0]?.toLowerCase();
      return repoOwner && repoOwner !== userLogin;
    });
    const foreignRatio = foreignEvents.length / events.length;

    if (
      foreignRatio === CONFIG.FOREIGN_RATIO_FULL &&
      user.public_repos < CONFIG.PERSONAL_REPOS_NONE
    ) {
      score += CONFIG.POINTS_NO_PERSONAL_ACTIVITY;
      flags.push({
        label: "No Personal Activity",
        points: CONFIG.POINTS_NO_PERSONAL_ACTIVITY,
        detail: `100% external activity, only ${user.public_repos} personal repos`,
      });
    } else if (
      foreignRatio >= CONFIG.FOREIGN_RATIO_HIGH &&
      user.public_repos < CONFIG.PERSONAL_REPOS_LOW
    ) {
      score += CONFIG.POINTS_EXTERNAL_FOCUS;
      flags.push({
        label: "External Focus",
        points: CONFIG.POINTS_EXTERNAL_FOCUS,
        detail: `${Math.round(foreignRatio * 100)}% external, ${user.public_repos} personal repos`,
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
