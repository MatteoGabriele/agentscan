import { describe, expect, it } from "vitest";
import { countClassificationByDate } from "../../../../shared/utils/count-classification-by-date";
import { MOCK_ECOSYSTEM_HEALTH_ITEMS } from "../../mocks/ecosystemHealthItems";

describe("countClassificationByDate", () => {
  const result = countClassificationByDate(MOCK_ECOSYSTEM_HEALTH_ITEMS);
  it("returns an object with ISO timestamps as keys", () => {
    const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    Object.keys(result).forEach((key) => {
      expect(key).toMatch(isoTimestampRegex);
    });
  });

  it("returns counts and trends for each date", () => {
    Object.values(result).forEach((value) => {
      expect(value).toEqual(
        expect.objectContaining({
          organic: expect.objectContaining({
            count: expect.any(Number),
            trend: expect.any(Number),
          }),
          mixed: expect.objectContaining({
            count: expect.any(Number),
            trend: expect.any(Number),
          }),
          automation: expect.objectContaining({
            count: expect.any(Number),
            trend: expect.any(Number),
          }),
        }),
      );
    });
  });
});
