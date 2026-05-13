import { Octokit } from "octokit";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const repository = getRouterParam(event, "name");

  if (!repository) {
    throw createError({
      statusCode: 400,
      message: "Missing name parameter",
    });
  }

  const session = await getUserSession(event);
  const token = session?.access_token || config.githubToken;

  // Parse owner and repo from the parameter (format: "owner/repo")
  const parts = repository.split("/");
  let owner: string;
  let repo: string;

  console.log(parts);

  const octokit = new Octokit({ auth: token });

  try {
    // Fetch all open pull requests
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner: "directus",
      repo: "directus",
      state: "open",
      per_page: 100,
    });

    // Extract PR information with author names
    const prsWithAuthors = pullRequests
      .filter((pr) => {
        return !["github-actions[bot]", "renovate[bot]"].includes(
          pr.user?.login ?? "",
        );
      })
      .map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        author: pr.user?.login || "unknown",
        authorName: pr.user?.name || pr.user?.login || "unknown",
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
      }));

    return {
      repository: repository,
      openPRsCount: prsWithAuthors.length,
      pullRequests: prsWithAuthors,
      authors: [...new Set(prsWithAuthors.map((pr) => pr.author))],
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
});
