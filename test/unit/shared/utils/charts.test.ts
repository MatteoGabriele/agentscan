import { describe, expect, it } from "vitest";
import {
  getCompleteDayRange,
  getDayKey,
  convertToHorizontalBarDataset,
  getClosedPrPercentageByRepo,
  getUniqueDatesFromSource,
  getClosedPrPercentageEvolutionByRepo,
  getClosedPrPercentageEvolutionTotal,
  getClosedPrPercentageTotal,
} from "../../../../shared/utils/charts";
import {
  EXPECTED_NB_UNIQUE_REPOS,
  MOCK_ECOSYSTEM_HEALTH_ITEMS,
} from "../../mocks/ecosystemHealthItems";

describe("getCompleteDayRange", () => {
  it("returns an empty array for an empty array in input", () => {
    expect(getCompleteDayRange([])).toStrictEqual([]);
  });

  it("fills in missing days between two dates (YYYY-MM-DD)", () => {
    const startDate = "2050-01-01";
    const endDate = "2050-01-05";
    expect(getCompleteDayRange([startDate, endDate])).toStrictEqual([
      "2050-01-01",
      "2050-01-02",
      "2050-01-03",
      "2050-01-04",
      "2050-01-05",
    ]);
  });
});

describe("getDayKey", () => {
  it("converts a timestamp to YYYY-MM-DD format", () => {
    const date = "2050-01-01T04:51:35.330Z";
    expect(getDayKey(date)).toBe("2050-01-01");
  });
});

describe("convertToHorizontalBarDataset", () => {
  it("creates a dataset for the complete ecosystem data source", () => {
    expect(
      convertToHorizontalBarDataset(MOCK_ECOSYSTEM_HEALTH_ITEMS),
    ).toHaveLength(EXPECTED_NB_UNIQUE_REPOS);
  });

  it("creates a filtered dataset for a given date", () => {
    expect(
      convertToHorizontalBarDataset(MOCK_ECOSYSTEM_HEALTH_ITEMS, "2026-05-25"),
    ).toHaveLength(1);
  });

  it("creates a dataset for VueUiHorizontalBar", () => {
    const result = convertToHorizontalBarDataset(MOCK_ECOSYSTEM_HEALTH_ITEMS);

    expect(result).toEqual(
      expect.arrayContaining(
        result.map(() =>
          expect.objectContaining({
            name: expect.any(String),
            value: expect.any(Number),
          }),
        ),
      ),
    );
  });
});

describe("getClosedPrPercentageByRepo", () => {
  it("maps ecosystem source data to a list of unique repos with eligible and closed PRs and a global health percentage", () => {
    const result = getClosedPrPercentageByRepo(MOCK_ECOSYSTEM_HEALTH_ITEMS, {});

    expect(result).toHaveLength(EXPECTED_NB_UNIQUE_REPOS);

    expect(result).toEqual(
      expect.arrayContaining(
        result.map(() =>
          expect.objectContaining({
            repo: expect.any(String),
            eligiblePrs: expect.any(Number),
            closedPrs: expect.any(Number),
            percentage: expect.any(Number),
          }),
        ),
      ),
    );
  });

  it("maps the source data for a given score range", () => {
    const result = getClosedPrPercentageByRepo(MOCK_ECOSYSTEM_HEALTH_ITEMS, {
      scoreBounds: [0, 50],
    });

    // All eligible PRs are closed = 100% closure rate
    expect(result[0]).toEqual(
      expect.objectContaining({
        repo: expect.any(String),
        eligiblePrs: 1,
        closedPrs: 1,
        percentage: 100,
      }),
    );

    // No eligible PRs are closed = 0% closure rate
    expect(result[1]).toEqual(
      expect.objectContaining({
        repo: expect.any(String),
        eligiblePrs: 1,
        closedPrs: 0,
        percentage: 0,
      }),
    );

    // No eligible PRs = 100% closure rate
    expect(result[2]).toEqual(
      expect.objectContaining({
        repo: expect.any(String),
        eligiblePrs: 0,
        closedPrs: 0,
        percentage: 100,
      }),
    );
  });
});

describe("getUniqueDatesFromSource", () => {
  it("returns a sorted array of unique dates from the ecosystem source data", () => {
    const result = getUniqueDatesFromSource(MOCK_ECOSYSTEM_HEALTH_ITEMS);
    expect(result).toHaveLength(2);
    expect(result).toStrictEqual(["2026-05-25", "2026-05-26"]);
  });
});

describe("getClosedPrPercentageEvolutionByRepo", () => {
  it("generates a dataset for VueUiXy to graph PR closure rate for a given score range", () => {
    const result = getClosedPrPercentageEvolutionByRepo(
      MOCK_ECOSYSTEM_HEALTH_ITEMS,
    );

    expect(result).toHaveLength(EXPECTED_NB_UNIQUE_REPOS);
    const flatResult = result.flat();
    expect(flatResult).toHaveLength(EXPECTED_NB_UNIQUE_REPOS);

    flatResult.forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          series: expect.any(Array),
          type: "line",
          smooth: true,
          hasData: expect.any(Boolean),
          details: expect.objectContaining({
            eligiblePrs: expect.any(Array),
            closedPrs: expect.any(Array),
          }),
        }),
      );

      expect(item.series.every((value) => typeof value === "number")).toBe(
        true,
      );
      expect(
        item.details.eligiblePrs.every(
          (value: unknown) => typeof value === "number",
        ),
      ).toBe(true);
      expect(
        item.details.closedPrs.every(
          (value: unknown) => typeof value === "number",
        ),
      ).toBe(true);
    });
  });
});

describe("getClosedPrPercentageEvolutionTotal", () => {
  it("generates a VueUiXyDatasetItem for closed PR percentage", () => {
    const result = getClosedPrPercentageEvolutionTotal(
      MOCK_ECOSYSTEM_HEALTH_ITEMS,
    );
    expect(result).toEqual(
      expect.objectContaining({
        name: "Automation PR closure rate",
        series: [0, 40],
        type: "line",
        smooth: true,
      }),
    );
  });
});

describe("getClosedPrPercentageTotal", () => {
  it("returns the total percentage of closed PRs", () => {
    const result = getClosedPrPercentageTotal(MOCK_ECOSYSTEM_HEALTH_ITEMS);
    expect(result).toEqual(40);
  });
});
