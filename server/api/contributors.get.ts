import { Octokit } from "octokit";

const cibotList = ["actions-user"];

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data: app } = await octokit.rest.repos.listContributors({
      owner: "MatteoGabriele",
      repo: "agentscan",
      page_page: 30,
    });

    const { data: action } = await octokit.rest.repos.listContributors({
      owner: "MatteoGabriele",
      repo: "agentscan-action",
      page_page: 30,
    });

    const { data: core } = await octokit.rest.repos.listContributors({
      owner: "unveil-project",
      repo: "identity",
      page_page: 30,
    });

    const contributors = [
      ...new Map(
        [...core, ...app, ...action].map((account) => [account.login, account]),
      ).values(),
    ];

    return contributors
      .filter((item) => item.login && !cibotList.includes(item.login))
      .map((item) => ({
        name: item.login,
        avatar: item.avatar_url,
        url: `https://github.com/${item.login}`,
        id: item.id,
      }));
  } catch (err: unknown) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch contributors",
    });
  }
});
