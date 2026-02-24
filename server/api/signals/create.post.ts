import { Agent } from "@atproto/api";
import { createOAuthClient } from "~~/server/utils/atproto";
import { Redis } from "@upstash/redis";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const redis = new Redis({
    url: config.upstash.redisRestUrl,
    token: config.upstash.redisRestToken,
  });

  const did = getCookie(event, "atproto_did");
  if (!did) {
    throw createError({ statusCode: 401 });
  }

  const { githubUsername, reaction } = await readBody(event);
  const oauthClient = createOAuthClient();
  const session = await oauthClient.restore(did);
  const agent = new Agent(session);

  const existing = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: "app.netlify.agentscan.reaction",
  });

  const alreadyReacted = existing.data.records.some(
    (r: any) => r.value.subject === githubUsername,
  );

  if (alreadyReacted) {
    throw createError({ statusCode: 409, message: "Already reacted" });
  }

  const result = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: "app.netlify.agentscan.reaction",
    record: {
      $type: "app.netlify.agentscan.reaction",
      subject: githubUsername,
      reaction,
      createdAt: new Date().toISOString(),
    },
  });

  // save DID to the set of reactors for this page
  await redis.sadd(`reactors:${githubUsername}`, did);

  return result.data;
});
