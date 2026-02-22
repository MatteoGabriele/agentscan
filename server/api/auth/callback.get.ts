// server/api/auth/callback.get.ts
import { createOAuthClient } from "~~/server/utils/atproto";

export default defineEventHandler(async (event) => {
  const params = getQuery(event);
  const oauthClient = createOAuthClient();

  const { session } = await oauthClient.callback(
    new URLSearchParams(params as any),
  );

  setCookie(event, "atproto_did", session.did, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false, // set to false for local dev
  });

  const redirectTo = getCookie(event, "auth_redirect") ?? "/";
  deleteCookie(event, "auth_redirect");

  return sendRedirect(event, redirectTo);
});
