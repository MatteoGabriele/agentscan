import { identifyReplicant } from "~~/shared/utils/voight-kampff-test/identify-replicant";
import { Octokit } from "octokit";
import * as v from "valibot";

const QuerySchema = v.object({
  created_at: v.pipe(
    v.string("created_at is required"),
    v.check(
      (value) => value.trim().length > 0 && !Number.isNaN(Date.parse(value)),
      "created_at must be a valid ISO 8601 date string",
    ),
  ),
  repos_count: v.pipe(
    v.number("repos_count must be a number"),
    v.integer("repos_count must be an integer"),
    v.minValue(0, "repos_count must be a non-negative integer"),
  ),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const username = getRouterParam(event, "username");

  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Missing username parameter",
    });
  }

  const query = getQuery(event);
  const parsedQuery = v.safeParse(QuerySchema, {
    created_at: query.created_at,
    repos_count: query.repos_count
      ? parseInt(String(query.repos_count), 10)
      : 0,
  });

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid query parameters",
    });
  }

  try {
    const octokit = new Octokit({ auth: config.githubToken });

    const { data: events } =
      await octokit.rest.activity.listPublicEventsForUser({
        username: username.toLowerCase(),
        per_page: 100,
        page: 1,
      });

    try {
      return {
        analysis: identifyReplicant({
          accountName: username,
          reposCount: parsedQuery.output.repos_count,
          createdAt: parsedQuery.output.created_at,
          events,
        }),
        eventsCount: events.length,
      };
    } catch {
      throw createError({
        statusCode: 500,
        message: "Failed to analyze replicant data",
      });
    }
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
});
