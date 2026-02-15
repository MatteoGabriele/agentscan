import {
  analyzeUser,
  type GitHubUser,
  type GitHubEvent,
} from "../utils/botDetectionScorer";

// Cache results for 10 minutes (600 seconds)
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const username = query.user as string;

  if (!username) {
    throw createError({ statusCode: 400, message: "Missing user parameter" });
  }

  // Fetch user and events (no auth - 60 requests/hour)
  const [user, events] = await Promise.all([
    $fetch<GitHubUser>(`https://api.github.com/users/${username}`).catch(
      () => null,
    ),
    $fetch<GitHubEvent[]>(
      `https://api.github.com/users/${username}/events?per_page=100`,
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
