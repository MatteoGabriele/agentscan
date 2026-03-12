import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";
import { identifyReplicant } from "voight-kampff-test";

import fs from "fs";
import path from "path";

function getFolder(folderName: "automation" | "organic") {
  const fixturesDir = path.join(__dirname, "fixtures", folderName);
  return fs
    .readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file, index) => {
      const filePath = path.join(fixturesDir, file);
      return [
        JSON.parse(fs.readFileSync(filePath, "utf-8")),
        `automation ${index + 1}`,
      ];
    });
}

const automationFixtures = getFolder("automation");
describe("identity-replicant (automation)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(automationFixtures)("analysis $1", (fixture) => {
    const date = new Date(2026, 2, 10, 12);
    vi.setSystemTime(date);

    const identity = identifyReplicant({
      createdAt: fixture.user.created_at,
      reposCount: fixture.user.public_repos,
      accountName: fixture.user.login,
      events: fixture.events,
    });
    expect(identity).toMatchSnapshot();
  });
});

const organicFixtures = getFolder("organic");
describe("identity-replicant (organic)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(organicFixtures)("analysis $1", (fixture) => {
    const date = new Date(2026, 2, 10, 12);
    vi.setSystemTime(date);

    console.log(new Date());
    const identity = identifyReplicant({
      createdAt: fixture.user.created_at,
      reposCount: fixture.user.public_repos,
      accountName: fixture.user.login,
      events: fixture.events,
    });
    expect(identity).toMatchSnapshot();
  });
});
