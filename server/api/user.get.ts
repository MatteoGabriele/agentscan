import {
  analyzeUser,
  type GitHubUser,
  type GitHubEvent,
} from "../utils/botDetectionScorer";

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const username = query.user as string;

  if (!username) {
    throw createError({ statusCode: 400, message: "Missing user parameter" });
  }

  const headers = getHeaders();

  // Fetch user and events only (repos removed - not useful)
  const [user, events] = await Promise.all([
    $fetch<GitHubUser>(`https://api.github.com/users/${username}`, {
      headers,
    }).catch(() => null),
    $fetch<GitHubEvent[]>(
      `https://api.github.com/users/${username}/events?per_page=100`,
      { headers },
    ).catch(() => []),
  ]);

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
});
