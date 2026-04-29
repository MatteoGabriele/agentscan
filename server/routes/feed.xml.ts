import type { VerifiedAutomation } from "~~/shared/types/automation";

export default defineEventHandler(async (event) => {
  try {
    // Fetch the verified automations list
    const automations: VerifiedAutomation[] = await $fetch(
      "/api/verified-automations",
    );

    // Sort by createdAt in descending order (newest first)
    const sortedAutomations = [...automations].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Generate RSS feed
    const rss = generateRSSFeed(sortedAutomations);

    // Set proper content-type header
    setHeader(event, "Content-Type", "application/rss+xml");
    setHeader(event, "Cache-Control", "public, max-age=3600");

    return rss;
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to generate RSS feed",
    });
  }
});

function generateRSSFeed(automations: VerifiedAutomation[]): string {
  const baseUrl = "https://agentscan.netlify.app";
  const lastBuildDate = new Date().toUTCString();
  const feedLastUpdate = automations[0]
    ? new Date(automations[0].createdAt).toUTCString()
    : lastBuildDate;

  const itemsXML = automations
    .map((automation) => {
      const guid = `${baseUrl}/user/${automation.username}`;
      const link = guid;
      const pubDate = new Date(automation.createdAt).toUTCString();
      const description = escapeXML(automation.reason);
      const title = escapeXML(automation.username);

      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <author>agentscan@example.com</author>
      <category>Automation</category>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>AgentScan - Verified Automations Feed</title>
    <link>${baseUrl}</link>
    <description>Latest updates on verified accounts heavily using automation and bots on GitHub</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <pubDate>${feedLastUpdate}</pubDate>
    <generator>AgentScan</generator>
    <image>
      <url>${baseUrl}/favicon.ico</url>
      <title>AgentScan</title>
      <link>${baseUrl}</link>
    </image>
    <docs>http://www.rssboard.org/rss-specification</docs>
${itemsXML}
  </channel>
</rss>`;
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
