import { Agent } from "@atproto/api";
import { Redis } from "@upstash/redis";
import { Reaction } from "~~/shared/types/identity";

export default defineEventHandler(async (event): Promise<Reaction[]> => {
  const config = useRuntimeConfig();
  const redis = new Redis({
    url: config.upstash.redisRestUrl,
    token: config.upstash.redisRestToken,
  });

  const username = getRouterParam(event, "username")!;
  const recordAgent = new Agent({ service: "https://bsky.social" });
  const profileAgent = new Agent({ service: "https://public.api.bsky.app" });

  const dids = await redis.smembers(`reactors:${username}`);
  if (!dids.length) return [];

  const reactions = await Promise.all(
    dids.map(async (did): Promise<Reaction | null> => {
      try {
        const result = await recordAgent.com.atproto.repo.listRecords({
          repo: did,
          collection: "app.netlify.agentscan.reaction",
        });

        const record = result.data.records.find(
          (r: any) => r.value.subject === username,
        );

        if (!record) return null;

        const profile = await profileAgent.getProfile({ actor: did });

        return {
          did,
          handle: profile.data.handle,
          displayName: profile.data.displayName,
          avatar: profile.data.avatar,
          reaction: (record.value as any).reaction,
          createdAt: (record.value as any).createdAt,
        };
      } catch (e) {
        console.error("failed for did", did, e);
        return null;
      }
    }),
  );

  return reactions.filter((r): r is Reaction => r !== null);
});
