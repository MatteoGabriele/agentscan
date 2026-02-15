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
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays < 30) {
    score += 20;
    flags.push({
      label: "New Account",
      points: 20,
      detail: `${ageDays} days old`,
    });
  } else if (ageDays < 90) {
    score += 10;
    flags.push({
      label: "Young Account",
      points: 10,
      detail: `${ageDays} days old`,
    });
  }

  // No identity (no name AND no bio)
  const hasIdentity = !!(user.name || user.bio);
  if (!hasIdentity) {
    score += 15;
    flags.push({
      label: "No Identity",
      points: 15,
      detail: "Missing name and bio",
    });
  }

  // Low followers relative to following (follow bots)
  if (user.following > 50 && user.followers < 5) {
    score += 15;
    flags.push({
      label: "Follow Ratio",
      points: 15,
      detail: `${user.followers} followers, ${user.following} following`,
    });
  } else if (user.followers === 0 && user.following > 0) {
    score += 10;
    flags.push({
      label: "Zero Followers",
      points: 10,
      detail: "No followers yet",
    });
  }

  if (events.length >= 10) {
    const timestamps = events.map((e) => new Date(e.created_at));
    const userLogin = user.login.toLowerCase();

    // Fork surge
    // AI agents fork lots of repos to contribute
    const forkEvents = events.filter((e) => e.type === "ForkEvent");
    if (forkEvents.length >= 8) {
      score += 30;
      flags.push({
        label: "Fork Surge",
        points: 30,
        detail: `${forkEvents.length} repos forked recently`,
      });
    } else if (forkEvents.length >= 5) {
      score += 20;
      flags.push({
        label: "Multiple Forks",
        points: 20,
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
    // 16+ unique hours in a day = inhuman/unhealthy (only 8 hours to sleep/eat/live)
    const daysWithManyHours: string[] = [];
    eventsByDay.forEach((dayTimestamps, day) => {
      const uniqueHours = new Set(dayTimestamps.map((t) => t.getUTCHours()));
      if (uniqueHours.size >= 16) {
        daysWithManyHours.push(day);
      }
    });

    // Check if these inhuman days are consecutive
    if (daysWithManyHours.length >= 3) {
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

      // Consecutive 16+ hour days = definitely not human or really needs to touch grass
      if (maxConsecutive >= 3) {
        score += 40;
        flags.push({
          label: "Nonstop Activity",
          points: 40,
          detail: `${maxConsecutive} consecutive days with 16+ hours of activity`,
        });
      } else if (daysWithManyHours.length >= 5) {
        score += 25;
        flags.push({
          label: "Frequent Marathon Days",
          points: 25,
          detail: `${daysWithManyHours.length} days with 16+ hours of activity`,
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

    if (maxStreak >= 21) {
      score += 25;
      flags.push({
        label: "Continuous Activity",
        points: 25,
        detail: `${maxStreak} consecutive days of activity`,
      });
    }

    // 4. Repo spread
    // extremely wide spread is suspicious
    // 40+ repos is extreme, 25+ is high
    const uniqueRepos = new Set(
      events.map((e) => e.repo?.name).filter(Boolean),
    );
    if (uniqueRepos.size >= 40) {
      score += 25;
      flags.push({
        label: "Extreme Repo Spread",
        points: 25,
        detail: `Active in ${uniqueRepos.size} different repos`,
      });
    } else if (uniqueRepos.size >= 25) {
      score += 10;
      flags.push({
        label: "Wide Repo Spread",
        points: 10,
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
    if (prsToday.length >= 15) {
      score += 20;
      flags.push({
        label: "PR Burst",
        points: 20,
        detail: `${prsToday.length} external PRs in 24 hours`,
      });
    } else if (prsThisWeek.length >= 20) {
      // Many PRs in a week
      score += 15;
      flags.push({
        label: "High PR Frequency",
        points: 15,
        detail: `${prsThisWeek.length} external PRs in 7 days`,
      });
    }

    // Also flag if lots of PRs AND few personal repos (regardless of time)
    if (externalPRs.length >= 15 && user.public_repos < 5) {
      score += 20;

      let detail = `${externalPRs.length} external PRs but only ${user.public_repos} personal repos`;
      if (user.public_repos === 0) {
        detail = `${externalPRs.length} external PRs and no personal repos`;
      }

      flags.push({
        label: "PR-Only Contributor",
        points: 20,
        detail,
      });
    }

    // 6. 100% external activity with no personal repos = almost certain bot
    const foreignEvents = events.filter((e) => {
      const repoOwner = e.repo?.name.split("/")[0]?.toLowerCase();
      return repoOwner && repoOwner !== userLogin;
    });
    const foreignRatio = foreignEvents.length / events.length;

    if (foreignRatio === 1 && user.public_repos < 3) {
      score += 30;
      flags.push({
        label: "No Personal Activity",
        points: 30,
        detail: `100% external activity, only ${user.public_repos} personal repos`,
      });
    } else if (foreignRatio >= 0.95 && user.public_repos < 5) {
      score += 20;
      flags.push({
        label: "External Focus",
        points: 20,
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
