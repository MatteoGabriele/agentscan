// server/api/auth/login.post.ts
import { createOAuthClient } from "~~/server/utils/atproto";

export default defineEventHandler(async (event) => {
  const { handle, redirectTo } = await readBody(event);
  const oauthClient = createOAuthClient();
  const url = await oauthClient.authorize(handle, {
    scope: "atproto repo:app.netlify.agentscan.reaction",
  });

  if (redirectTo) {
    setCookie(event, "auth_redirect", redirectTo, {
      httpOnly: true,
      sameSite: true,
      path: "/",
      maxAge: 60 * 10,
    });
  }

  return { url: url.toString() };
});
