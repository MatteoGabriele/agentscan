// server/api/auth/login.post.ts
import { createOAuthClient } from "~~/server/utils/atproto";

export default defineEventHandler(async (event) => {
  const { handle } = await readBody(event);
  const oauthClient = createOAuthClient();
  const url = await oauthClient.authorize(handle, {
    scope: "atproto repo:app.netlify.agentscan.reaction",
  });
  return { url: url.toString() };
});
