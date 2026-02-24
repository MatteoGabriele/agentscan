// server/api/reactions/delete.post.ts
import { Agent } from "@atproto/api";
import { Redis } from "@upstash/redis";
import { createOAuthClient } from "~~/server/utils/atproto";

export default defineEventHandler(async (event) => {
  const did = getCookie(event, "atproto_did");
  if (!did) {
    throw createError({ statusCode: 401 });
  }

  const { githubUsername } = await readBody(event);
  const config = useRuntimeConfig();
  const redis = new Redis({
    url: config.upstash.redisRestUrl,
    token: config.upstash.redisRestToken,
  });

  const oauthClient = createOAuthClient();
  const session = await oauthClient.restore(did);
  const agent = new Agent(session);

  // find the record first to get its rkey
  const result = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: "app.netlify.agentscan.reaction",
  });

  const record = result.data.records.find(
    (r: any) => r.value.subject === githubUsername,
  );

  if (!record)
    throw createError({ statusCode: 404, message: "Record not found" });

  // rkey is the last segment of the uri
  const rkey = record.uri.split("/").pop()!;

  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection: "app.netlify.agentscan.reaction",
    rkey,
  });

  // remove from redis set
  await redis.srem(`reactors:${githubUsername}`, did);

  return { ok: true };
});
