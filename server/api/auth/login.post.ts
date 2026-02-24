export default defineEventHandler(async (event) => {
  const { redirectTo } = await readBody(event);
  const oauthClient = createOAuthClient();

  const url = await oauthClient.authorize("https://bsky.social", {
    scope: "atproto repo:app.netlify.agentscan.reaction",
  });

  if (redirectTo) {
    setCookie(event, "auth_redirect", redirectTo, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  return { url: url.toString() };
});
