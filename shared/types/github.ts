export type GitHubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
};

export type GitHubEvent = {
  type: string;
  created_at: string;
  repo?: { name: string };
  payload?: {
    commits?: Array<{ message: string }>;
    pull_request?: { title: string; body: string | null };
    issue?: { title: string; body: string | null };
  };
};

export type GitHubRepo = {
  fork: boolean;
};
