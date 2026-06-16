import { describe, expect, it } from "vitest";
import { formatUsername } from "../../../../server/utils/format-username";

describe("formatUsername", () => {
  it("does not throw on malformed URL encoding", () => {
    expect(() => formatUsername("%E0%A4%A")).not.toThrow();
  });
  it("returns an empty string if username is empty", () => {
    expect(formatUsername("")).toBe("");
  });

  it("converts to lowercase", () => {
    expect(formatUsername("CornyClank")).toBe("cornyclank");
  });

  it("trims leading and trailing white space", () => {
    expect(formatUsername("  CornyClank  ")).toBe("cornyclank");
  });

  it("removes the first space", () => {
    expect(formatUsername("Corny Clank")).toBe("cornyclank");
  });

  it("decodes URL encoded characters", () => {
    expect(formatUsername("Corny%20Clank")).toBe("cornyclank");
  });

  it("decodes URL encoded unicode characters", () => {
    expect(formatUsername("Cl%C3%B6nk")).toBe("clönk");
  });

  it("handles usernames that are already formatted", () => {
    expect(formatUsername("cornyclank")).toBe("cornyclank");
  });

  it("removes all white spaces", () => {
    expect(formatUsername("Corny Clank Deluxe")).toBe("cornyclankdeluxe");
  });
});
