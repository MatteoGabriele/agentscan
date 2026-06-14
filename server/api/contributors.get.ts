import { Octokit } from "octokit";

const cibotList = ["actions-user"];

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data } = await octokit.rest.repos.listContributors({
      owner: "MatteoGabriele",
      repo: "agentscan",
      page_page: 100,
    });

    return data
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
