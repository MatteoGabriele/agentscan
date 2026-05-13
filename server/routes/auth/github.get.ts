export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
    scope: ["public_repo"],
  },

  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        githubId: user.id,
      },
      apiToken: tokens.access_token,
      loggedInAt: new Date(),
    });
    return sendRedirect(event, "/");
  },

  onError(event, error) {
    console.error("GitHub OAuth error:", error);
    return sendRedirect(event, "/");
  },
});
