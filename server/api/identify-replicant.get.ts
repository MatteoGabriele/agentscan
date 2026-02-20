import { identifyReplicant, GitHubUser, GitHubEvent } from "voight-kampff-test";
import { Octokit } from "octokit";

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event);
    const username = query.user as string;

    const config = useRuntimeConfig();

    if (!username) {
      throw createError({ statusCode: 400, message: "Missing user parameter" });
    }

    let user: GitHubUser | null = null;
    let events: GitHubEvent[] = [];

    const oktokit = new Octokit({
      auth: config.githubToken,
    });

    try {
      const userResponse = await oktokit.rest.users.getByUsername({ username });
      const eventResponse = await oktokit.rest.activity.listPublicEventsForUser(
        {
          username,
          per_page: 100,
          page: 1,
        },
      );

      user = userResponse.data;
      events = eventResponse.data;
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
      analysis: identifyReplicant(user, events),
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
