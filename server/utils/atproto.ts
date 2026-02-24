import {
  NodeOAuthClient,
  NodeSavedState,
  NodeSavedSession,
} from "@atproto/oauth-client-node";
import { Redis } from "@upstash/redis";

export function createOAuthClient() {
  const config = useRuntimeConfig();
  const redis = new Redis({
    url: config.upstash.redisRestUrl,
    token: config.upstash.redisRestToken,
  });

  const stateStore = {
    async get(key: string): Promise<NodeSavedState | undefined> {
      const val = await redis.get<NodeSavedState>(key);
      return val ?? undefined;
    },
    async set(key: string, val: NodeSavedState): Promise<void> {
      await redis.set(key, val);
    },
    async del(key: string): Promise<void> {
      await redis.del(key);
    },
  };

  const sessionStore = {
    async get(key: string): Promise<NodeSavedSession | undefined> {
      const val = await redis.get<NodeSavedSession>(key);
      return val ?? undefined;
    },
    async set(key: string, val: NodeSavedSession): Promise<void> {
      await redis.set(key, val);
    },
    async del(key: string): Promise<void> {
      await redis.del(key);
    },
  };

  const siteUrl = config.public.siteUrl;

  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${siteUrl}/client-metadata.json`,
      client_name: "AgentScan",
      client_uri: siteUrl,
      redirect_uris: [`${siteUrl}/auth/callback`],
      scope: "atproto repo:app.netlify.agentscan.reaction",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
      application_type: "web",
    },
    stateStore,
    sessionStore,
  });
}
