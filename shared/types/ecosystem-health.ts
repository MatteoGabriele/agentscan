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
