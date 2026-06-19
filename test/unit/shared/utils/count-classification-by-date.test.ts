import { describe, expect, it } from "vitest";
import {
  countClassificationByDate,
  getCategoryDeltas,
} from "../../../../shared/utils/count-classification-by-date";
import { MOCK_ECOSYSTEM_HEALTH_ITEMS } from "../../mocks/ecosystemHealthItems";
import { EcosystemHealthItem } from "../../../../shared/types/ecosystem-health";

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

describe("getCategoryDeltas", () => {
  const previousDate = "2026-06-18T11:38:32.093Z";
  const lastDate = "2026-06-19T14:37:04.644Z";

  function createEcosystemHealthItem(
    created_at: string,
    score: number,
  ): EcosystemHealthItem {
    return {
      created_at,
      score,
    } as EcosystemHealthItem;
  }

  it("returns category deltas keyed by category", () => {
    const result = getCategoryDeltas([
      createEcosystemHealthItem(lastDate, 90),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 10),
      createEcosystemHealthItem(previousDate, 90),
      createEcosystemHealthItem(previousDate, 50),
      createEcosystemHealthItem(previousDate, 10),
    ]);

    expect(result).toEqual({
      organic: expect.objectContaining({
        category: "organic",
        lastDate: expect.any(String),
        lastCount: expect.any(Number),
        lastTotal: expect.any(Number),
        lastPercentage: expect.any(Number),
        previousDate: expect.any(String),
        previousCount: expect.any(Number),
        previousTotal: expect.any(Number),
        previousPercentage: expect.any(Number),
        percentagePointDifference: expect.any(Number),
      }),
      mixed: expect.objectContaining({
        category: "mixed",
        lastDate: expect.any(String),
        lastCount: expect.any(Number),
        lastTotal: expect.any(Number),
        lastPercentage: expect.any(Number),
        previousDate: expect.any(String),
        previousCount: expect.any(Number),
        previousTotal: expect.any(Number),
        previousPercentage: expect.any(Number),
        percentagePointDifference: expect.any(Number),
      }),
      automation: expect.objectContaining({
        category: "automation",
        previousDate: expect.any(String),
        previousCount: expect.any(Number),
        previousTotal: expect.any(Number),
        previousPercentage: expect.any(Number),
        lastDate: expect.any(String),
        lastCount: expect.any(Number),
        lastTotal: expect.any(Number),
        lastPercentage: expect.any(Number),
        percentagePointDifference: expect.any(Number),
      }),
    });
  });

  it("returns null previous values when there is only one date", () => {
    const result = getCategoryDeltas([
      createEcosystemHealthItem(lastDate, 90),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 10),
    ]);

    expect(result).toEqual({
      organic: expect.objectContaining({
        category: "organic",
        lastDate: expect.any(String),
        lastCount: expect.any(Number),
        lastTotal: expect.any(Number),
        lastPercentage: expect.any(Number),
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        percentagePointDifference: null,
      }),
      mixed: expect.objectContaining({
        category: "mixed",
        lastDate: expect.any(String),
        lastCount: expect.any(Number),
        lastTotal: expect.any(Number),
        lastPercentage: expect.any(Number),
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        percentagePointDifference: null,
      }),
      automation: expect.objectContaining({
        category: "automation",
        lastDate: expect.any(String),
        lastCount: expect.any(Number),
        lastTotal: expect.any(Number),
        lastPercentage: expect.any(Number),
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        percentagePointDifference: null,
      }),
    });
  });

  it("returns null values when the source is empty", () => {
    const result = getCategoryDeltas([]);

    expect(result).toEqual({
      organic: expect.objectContaining({
        category: "organic",
        lastDate: undefined,
        lastCount: null,
        lastTotal: null,
        lastPercentage: null,
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        percentagePointDifference: null,
      }),
      mixed: expect.objectContaining({
        category: "mixed",
        lastDate: undefined,
        lastCount: null,
        lastTotal: null,
        lastPercentage: null,
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        percentagePointDifference: null,
      }),
      automation: expect.objectContaining({
        category: "automation",
        lastDate: undefined,
        lastCount: null,
        lastTotal: null,
        lastPercentage: null,
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        percentagePointDifference: null,
      }),
    });
  });

  it("calculates accurate category percentages and point differences", () => {
    const result = getCategoryDeltas([
      createEcosystemHealthItem(lastDate, 90),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 10),

      createEcosystemHealthItem(previousDate, 90),
      createEcosystemHealthItem(previousDate, 90),
      createEcosystemHealthItem(previousDate, 50),
      createEcosystemHealthItem(previousDate, 10),
    ]);

    expect(result.organic.previousPercentage).toBe(50);
    expect(result.organic.lastPercentage).toBe(25);
    expect(result.organic.percentagePointDifference).toBe(-25);

    expect(result.mixed.previousPercentage).toBe(25);
    expect(result.mixed.lastPercentage).toBe(50);
    expect(result.mixed.percentagePointDifference).toBe(25);

    expect(result.automation.previousPercentage).toBe(25);
    expect(result.automation.lastPercentage).toBe(25);
    expect(result.automation.percentagePointDifference).toBe(0);
  });
});
