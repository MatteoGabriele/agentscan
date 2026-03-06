import { Octokit } from "octokit";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const username = getRouterParam(event, "username");

  if (!username) {
    throw createError({ statusCode: 400, message: "Missing user parameter" });
  }

  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data } = await octokit.rest.users.getByUsername({
      username,
    });

    return data;
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
