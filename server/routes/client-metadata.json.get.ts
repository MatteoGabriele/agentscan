export default defineEventHandler(() => {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl;

  return {
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
  };
});
