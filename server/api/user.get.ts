import {
  analyzeUser,
  type GitHubUser,
  type GitHubEvent,
} from "../utils/botDetectionScorer";

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event);
    const username = query.user as string;

    if (!username) {
      throw createError({ statusCode: 400, message: "Missing user parameter" });
    }

    // Fetch user and events (no auth - 60 requests/hour)
    let user: GitHubUser | null = null;
    let events: GitHubEvent[] = [];

    try {
      const [userResponse, eventsResponse] = await Promise.all([
        $fetch<GitHubUser>(`https://api.github.com/users/${username}`),
        $fetch<GitHubEvent[]>(
          `https://api.github.com/users/${username}/events?per_page=100`,
        ).catch(() => []),
      ]);
      user = userResponse;
      events = eventsResponse;
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

    const analysis = analyzeUser(user, events ?? []);

    return {
      user: {
        login: user.login,
        avatar: user.avatar_url,
        name: user.name,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        repos: user.public_repos,
        created: user.created_at,
      },
      analysis,
      eventCount: events?.length ?? 0,
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
