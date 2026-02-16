import { identifyReplicant } from "~~/shared/utils/voight-kampff-machine";

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event);
    const username = query.user as string;

    if (!username) {
      throw createError({ statusCode: 400, message: "Missing user parameter" });
    }

    let user: GitHubUser | null = null;
    let events: GitHubEvent[] = [];
    let repos: GitHubRepo[] = [];

    try {
      const [userResponse, reposResponse, eventsResponse] = await Promise.all([
        $fetch<GitHubUser>(`https://api.github.com/users/${username}`),
        $fetch<GitHubRepo[]>(
          `https://api.github.com/users/${username}/repos?type=owner`,
        ).catch(() => []),
        $fetch<GitHubEvent[]>(
          `https://api.github.com/users/${username}/events?per_page=100`,
        ).catch(() => []),
      ]);
      user = userResponse;
      events = eventsResponse;
      repos = reposResponse.filter((repo) => !repo.fork);
    } catch (err: unknown) {
      const error = err as { status?: number; statusCode?: number };
      const status = error.status ?? error.statusCode;

      if (status === 403) {
        throw createError({
          statusCode: 429,
          message: "GitHub API rate limit reached. Please try again later.",
        });
      }

      if (status === 404) {
        throw createError({ statusCode: 404, message: "User not found" });
      }

      throw createError({
        statusCode: 500,
        message: "Failed to fetch user data from GitHub",
      });
    }

    if (!user) {
      throw createError({ statusCode: 404, message: "User not found" });
    }

    return {
      user,
      ownedPublicReposCount: repos.length,
      analysis: identifyReplicant({ user, events, repos }),
      eventsCount: events.length,
    };
  },
  {
    maxAge: 600, // 10 minutes
    getKey: (event) => {
      const query = getQuery(event);
      const user = (query.user as string) ?? "";

      return `username:${encodeURIComponent(user.toLowerCase())}`;
    },
  },
);
