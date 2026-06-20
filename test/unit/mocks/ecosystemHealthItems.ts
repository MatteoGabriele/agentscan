import type { EcosystemHealthItem } from "../../../shared/types/ecosystem-health";

export const MOCK_ECOSYSTEM_HEALTH_ITEMS: EcosystemHealthItem[] = [
  {
    created_at: "2026-05-26T19:27:30.519Z",
    score: 100,
    pr_key: "pr-a1",
    pr_status: "open",
    user_created_at: "2017-05-15T12:06:30Z",
    user_public_repos_count: 869,
    events_count: 200,
    repo_name: "nuxt/nuxt",
  },
  {
    created_at: "2026-05-25T19:27:30.519Z",
    score: 80,
    pr_key: "pr-b2",
    pr_status: "open",
    user_created_at: "2026-05-23T17:48:23Z",
    user_public_repos_count: 2,
    events_count: 20,
    repo_name: "nuxt/nuxt",
  },
  {
    created_at: "2026-05-26T19:27:30.519Z",
    score: 40,
    pr_key: "pr-b2",
    pr_status: "closed",
    user_created_at: "2026-05-23T17:48:23Z",
    user_public_repos_count: 2,
    events_count: 20,
    repo_name: "nuxt/nuxt",
  },
  {
    created_at: "2026-05-26T19:27:30.519Z",
    score: 100,
    pr_key: "pr-c3",
    pr_status: "open",
    user_created_at: "2010-02-19T01:37:09Z",
    user_public_repos_count: 6,
    events_count: 167,
    repo_name: "biomejs/biome",
  },
  {
    created_at: "2026-05-26T19:27:30.519Z",
    score: 1,
    pr_key: "pr-d4",
    pr_status: "open",
    user_created_at: "2020-04-21T11:59:50Z",
    user_public_repos_count: 13,
    events_count: 84,
    repo_name: "biomejs/biome",
  },
  {
    created_at: "2026-05-26T19:27:30.519Z",
    score: 100,
    pr_key: "pr-d4",
    pr_status: "closed",
    user_created_at: "2020-04-21T11:59:50Z",
    user_public_repos_count: 13,
    events_count: 84,
    repo_name: "some/repo",
  },
];

export const EXPECTED_NB_UNIQUE_REPOS = new Set(
  MOCK_ECOSYSTEM_HEALTH_ITEMS.map((s) => s.repo_name),
).size;
