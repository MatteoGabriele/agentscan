export const CONFIG = {
  THRESHOLD_HUMAN: 70, // >= this = "human"
  THRESHOLD_SUSPICIOUS: 50, // >= this = "suspicious", below = "likely_bot"
} as const;
