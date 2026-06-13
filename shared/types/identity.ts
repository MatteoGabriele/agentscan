export const githubEventTypes = [
  "PullRequestEvent",
  "CreateEvent",
  "ForkEvent",
  "IssueCommentEvent",
] as const;

export type GitHubEventType = (typeof githubEventTypes)[number];
