import { Agent } from "@atproto/api";

export default defineEventHandler(async (event) => {
  const did = getCookie(event, "atproto_did");
  if (!did) return { user: null };

  try {
    // public agent, no auth needed for profile lookup
    const agent = new Agent({ service: "https://public.api.bsky.app" });
    const profile = await agent.getProfile({ actor: did });
    return {
      user: {
        did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        avatar: profile.data.avatar,
      },
    };
  } catch (e) {
    console.error("profile fetch failed:", e);
    return { user: null };
  }
});
