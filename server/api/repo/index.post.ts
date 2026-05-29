import { Octokit } from "octokit";

const EXCLUDED_ACCOUNTS = [
  "github-actions[bot]",
  "renovate[bot]",
  "coderabbitai[bot]",
  "vercel[bot]",
];

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { owner, repo } = await readBody(event);

  if (!repo) {
    throw createError({
      statusCode: 400,
      message: "Missing repo parameter",
    });
  }

  const token = config.githubToken;
  const octokit = new Octokit({ auth: token });

  try {
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });

    const prsWithAuthors = pullRequests
      .filter((pr) => {
        return !EXCLUDED_ACCOUNTS.includes(pr.user?.login ?? "");
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
        type: "pull_request" as const,
      }));

    const contributions = prsWithAuthors;

    const allAuthors = [
      ...new Set(contributions.map((contribution) => contribution.author)),
    ];

    return {
      pullRequestsCount: pullRequests.length,
      contributions,
      authors: allAuthors,
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
