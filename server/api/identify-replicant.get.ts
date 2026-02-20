import { identifyReplicant } from "~~/shared/utils/voight-kampff-machine";
import type { GitHubUser, GitHubEvent } from "~~/shared/types/identity";
import { Octokit } from "octokit";

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig();
    const query = getQuery(event);
    const username = query.user as string;

    if (!username) {
      throw createError({ statusCode: 400, message: "Missing user parameter" });
    }

    const oktokit = new Octokit({
      auth: config.githubToken,
    });

    try {
      const { data: user } = await oktokit.rest.users.getByUsername({
        username,
      });
      const { data: events } =
        await oktokit.rest.activity.listPublicEventsForUser({
          username,
          per_page: 100,
          page: 1,
        });

      return {
        user,
        analysis: identifyReplicant(user, events),
        eventsCount: events.length,
      };
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
