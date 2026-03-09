import { expect, describe, it } from "vitest";
import { identifyReplicant } from "../shared/utils/voight-kampff-test/identify-replicant";
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
describe("idendity-replicant (automation)", () => {
  it.each(automationFixtures)("analysis $1", (fixture) => {
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
describe("idendity-replicant (organic)", () => {
  it.each(organicFixtures)("analysis $1", (fixture) => {
    const identity = identifyReplicant({
      createdAt: fixture.user.created_at,
      reposCount: fixture.user.public_repos,
      accountName: fixture.user.login,
      events: fixture.events,
    });
    expect(identity).toMatchSnapshot();
  });
});
