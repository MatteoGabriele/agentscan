export const CONFIG = {
  // Classification thresholds (inverted score: 100 = human, 0 = bot)
  THRESHOLD_HUMAN: 70, // >= this = "human"
  THRESHOLD_SUSPICIOUS: 50, // >= this = "suspicious", below = "likely_bot"

  // Account age thresholds (days)
  AGE_NEW_ACCOUNT: 30, // < this = "new account"
  AGE_YOUNG_ACCOUNT: 90, // < this = "young account"

  // Account age penalty points
  POINTS_NEW_ACCOUNT: 20,
  POINTS_YOUNG_ACCOUNT: 10,

  // Identity penalty
  POINTS_NO_IDENTITY: 15,

  // Follow ratio thresholds
  FOLLOW_RATIO_FOLLOWING_MIN: 50, // following > this AND followers < FOLLOW_RATIO_FOLLOWERS_MAX
  FOLLOW_RATIO_FOLLOWERS_MAX: 5,
  POINTS_FOLLOW_RATIO: 15,
  POINTS_ZERO_FOLLOWERS: 10,

  // Minimum events required for activity analysis
  MIN_EVENTS_FOR_ANALYSIS: 10,

  // Fork surge thresholds
  FORKS_EXTREME: 8, // >= this = "fork surge"
  FORKS_HIGH: 5, // >= this = "multiple forks"
  POINTS_FORK_SURGE: 30,
  POINTS_MULTIPLE_FORKS: 20,

  // Inhuman daily activity
  HOURS_PER_DAY_INHUMAN: 16, // >= this unique hours in a day = inhuman
  CONSECUTIVE_INHUMAN_DAYS_EXTREME: 3, // consecutive days with 16+ hours
  FREQUENT_MARATHON_DAYS: 5, // non-consecutive days with 16+ hours
  POINTS_NONSTOP_ACTIVITY: 40,
  POINTS_FREQUENT_MARATHON: 25,

  // Consecutive days streak
  CONSECUTIVE_DAYS_STREAK: 21, // >= this = suspicious
  POINTS_CONTINUOUS_ACTIVITY: 25,

  // Repo spread thresholds
  REPO_SPREAD_EXTREME: 40, // >= this = extreme spread
  REPO_SPREAD_HIGH: 25, // >= this = wide spread
  POINTS_EXTREME_REPO_SPREAD: 25,
  POINTS_WIDE_REPO_SPREAD: 10,

  // External PR thresholds
  PRS_TODAY_EXTREME: 15, // >= this in 24h = PR burst
  PRS_WEEK_HIGH: 20, // >= this in 7 days = high frequency
  POINTS_PR_BURST: 20,
  POINTS_HIGH_PR_FREQUENCY: 15,

  // PR-only contributor
  EXTERNAL_PRS_MIN: 15, // external PRs threshold
  PERSONAL_REPOS_LOW: 5, // < this personal repos with many external PRs
  POINTS_PR_ONLY_CONTRIBUTOR: 20,

  // External activity ratio
  FOREIGN_RATIO_FULL: 1, // 100% external
  FOREIGN_RATIO_HIGH: 0.95, // 95%+ external
  PERSONAL_REPOS_NONE: 3, // < this with 100% external = suspicious
  POINTS_NO_PERSONAL_ACTIVITY: 30,
  POINTS_EXTERNAL_FOCUS: 20,
} as const;
