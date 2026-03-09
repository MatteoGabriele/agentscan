#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateRandomId(prefix = "user") {
  const id = crypto.randomUUID();
  return `${prefix}-${id}`;
}

function anonymizeData(user, events) {
  const repoMapping = {};

  for (const event of events) {
    const repoName = event.repo.name;
    if (!repoMapping[repoName]) {
      repoMapping[repoName] = generateRandomId("repo");
    }
  }

  const anonymousUsername = generateRandomId("user");

  const anonymousUser = {
    login: anonymousUsername,
    created_at: user.created_at,
    public_repos: user.public_repos,
  };

  const anonymousEvents = events.map((event) => ({
    type: event.type,
    created_at: event.created_at,
    repo: {
      name: repoMapping[event.repo.name],
    },
  }));

  return { anonymousUser, anonymousEvents };
}

async function fetchGitHubEvents(username, type = "automation") {
  if (!username) {
    console.error("Usage: node fetch-github-events.js <github-username>");
    console.error("Example: node fetch-github-events.js crabby-rathbun");
    process.exit(1);
  }

  const userUrl = `https://api.github.com/users/${username}`;
  const eventsUrl = `https://api.github.com/users/${username}/events?per_page=100`;
  const outputDir = path.join(__dirname, "..", "test", "fixtures", type);

  try {
    console.log(`Fetching data for user: ${username}`);

    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Fetching user details: ${userUrl}`);
    const userResponse = await fetch(userUrl);
    if (!userResponse.ok) {
      throw new Error(
        `GitHub API error: ${userResponse.status} ${userResponse.statusText}`,
      );
    }
    const userData = await userResponse.json();

    const user = {
      login: userData.login,
      created_at: userData.created_at,
      public_repos: userData.public_repos,
    };

    console.log(`Fetching events: ${eventsUrl}`);
    const eventsResponse = await fetch(eventsUrl);
    if (!eventsResponse.ok) {
      throw new Error(
        `GitHub API error: ${eventsResponse.status} ${eventsResponse.statusText}`,
      );
    }
    const events = await eventsResponse.json();

    const transformedEvents = events.map((event) => ({
      type: event.type,
      created_at: event.created_at,
      repo: {
        name: event.repo.name,
      },
    }));

    const { anonymousUser, anonymousEvents } = anonymizeData(
      user,
      transformedEvents,
    );

    const outputFile = path.join(
      outputDir,
      `${type}_${anonymousUser.login}.json`,
    );

    const data = {
      user: anonymousUser,
      events: anonymousEvents,
    };

    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

    console.log(`✓ Successfully saved to: ${outputFile}`);
    console.log(
      `✓ User: ${anonymousUser.login} (${anonymousUser.public_repos} public repos)`,
    );
    console.log(`✓ Total events: ${anonymousEvents.length}`);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
}

fetchGitHubEvents(process.argv[2], process.argv[3]);
