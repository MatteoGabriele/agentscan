import type { calcLinearProgression } from "../calc-linear-progression";
import type { IdentityClassification } from "@unveil/identity";

export type EcosystemHealthItem = {
  created_at: string;
  user_id: number;
  score: number;
  pr_number: number;
  pr_status: string; // FIXME: narrow down
  user_created_at: string;
  user_public_repos_count: number;
  events_count: number;
  repo_name: string;
  username: string;
};

export type EcosystemHealthCategoryCounts = {
  automation: number;
  mixed: number;
  organic: number;
};

export type EcosystemHealthCategoryProgression = Record<
  IdentityClassification,
  ReturnType<typeof calcLinearProgression>
>;
