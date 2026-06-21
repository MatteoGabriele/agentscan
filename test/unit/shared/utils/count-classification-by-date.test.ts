import { describe, expect, it } from "vitest";
import {
  countClassificationByDate,
  getCategoryDeltas,
  getClassificationByDateChunks,
  getClassificationForPreviousDays,
  getWeeklyClassification,
} from "../../../../shared/utils/count-classification-by-date";
import { MOCK_ECOSYSTEM_HEALTH_ITEMS } from "../../mocks/ecosystemHealthItems";
import { EcosystemHealthItem } from "../../../../shared/types/ecosystem-health";

function createEcosystemHealthItem(
  created_at: string,
  score: number,
): EcosystemHealthItem {
  return {
    created_at,
    score,
  } as EcosystemHealthItem;
}

describe("countClassificationByDate", () => {
  const result = countClassificationByDate(MOCK_ECOSYSTEM_HEALTH_ITEMS);
  it("returns an object with date keys", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    Object.keys(result).forEach((key) => {
      expect(key).toMatch(dateRegex);
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

describe("getClassificationForPreviousDays", () => {
  it("returns aggregated counts for the requested day span", () => {
    const result = getClassificationForPreviousDays({
      date: "2026-06-10T18:30:00.000Z",
      days: 3,
      data: [
        createEcosystemHealthItem("2026-06-08T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-08T11:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-09T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-10T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-10T11:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-10T12:00:00.000Z", 10),

        createEcosystemHealthItem("2026-06-05T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-06T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-06T11:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-07T10:00:00.000Z", 10),

        createEcosystemHealthItem("2026-06-04T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-11T10:00:00.000Z", 90),
      ],
    });

    expect(result).toEqual({
      organic: {
        count: 2,
        trend: 100,
      },
      mixed: {
        count: 1,
        trend: -50,
      },
      automation: {
        count: 3,
        trend: 200,
      },
    });
  });

  it("returns empty counts when the day span is invalid", () => {
    const result = getClassificationForPreviousDays({
      date: "2026-06-10T18:30:00.000Z",
      days: 0,
      data: [createEcosystemHealthItem("2026-06-10T10:00:00.000Z", 90)],
    });

    expect(result).toEqual({
      organic: {
        count: 0,
        trend: 0,
      },
      mixed: {
        count: 0,
        trend: 0,
      },
      automation: {
        count: 0,
        trend: 0,
      },
    });
  });

  it("handles missing previous period values when calculating trends", () => {
    const result = getClassificationForPreviousDays({
      date: "2026-06-10T18:30:00.000Z",
      days: 2,
      data: [
        createEcosystemHealthItem("2026-06-09T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-10T10:00:00.000Z", 10),
      ],
    });

    expect(result).toEqual({
      organic: {
        count: 1,
        trend: 100,
      },
      mixed: {
        count: 0,
        trend: 0,
      },
      automation: {
        count: 1,
        trend: 100,
      },
    });
  });
});

describe("getClassificationByDateChunks", () => {
  it("returns classification chunks grouped by the requested day span", () => {
    const dates = [
      "2026-06-01T10:00:00.000Z",
      "2026-06-02T10:00:00.000Z",
      "2026-06-03T10:00:00.000Z",
      "2026-06-04T10:00:00.000Z",
      "2026-06-05T10:00:00.000Z",
      "2026-06-06T10:00:00.000Z",
      "2026-06-07T10:00:00.000Z",
      "2026-06-08T10:00:00.000Z",
    ];

    const result = getClassificationByDateChunks({
      dates,
      days: 3,
      data: [
        createEcosystemHealthItem("2026-06-01T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-02T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-03T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-04T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-04T11:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-05T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-06T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-07T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-08T10:00:00.000Z", 10),
      ],
    });

    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      startDate: "2026-06-01T10:00:00.000Z",
      endDate: "2026-06-03T10:00:00.000Z",
      days: 3,
      classification: {
        organic: {
          count: 1,
          trend: 100,
        },
        mixed: {
          count: 1,
          trend: 100,
        },
        automation: {
          count: 1,
          trend: 100,
        },
      },
    });

    expect(result[1]).toEqual({
      startDate: "2026-06-04T10:00:00.000Z",
      endDate: "2026-06-06T10:00:00.000Z",
      days: 3,
      classification: {
        organic: {
          count: 2,
          trend: 100,
        },
        mixed: {
          count: 1,
          trend: 0,
        },
        automation: {
          count: 1,
          trend: 0,
        },
      },
    });

    expect(result[2]).toEqual({
      startDate: "2026-06-07T10:00:00.000Z",
      endDate: "2026-06-08T10:00:00.000Z",
      days: 2,
      classification: {
        organic: {
          count: 0,
          trend: 0,
        },
        mixed: {
          count: 1,
          trend: 0,
        },
        automation: {
          count: 1,
          trend: 0,
        },
      },
    });
  });

  it("sorts dates before creating chunks", () => {
    const result = getClassificationByDateChunks({
      days: 2,
      dates: [
        "2026-06-04T10:00:00.000Z",
        "2026-06-01T10:00:00.000Z",
        "2026-06-03T10:00:00.000Z",
        "2026-06-02T10:00:00.000Z",
      ],
      data: [
        createEcosystemHealthItem("2026-06-01T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-02T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-03T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-04T10:00:00.000Z", 90),
      ],
    });

    expect(result.map((chunk) => chunk.startDate)).toEqual([
      "2026-06-01T10:00:00.000Z",
      "2026-06-03T10:00:00.000Z",
    ]);

    expect(result.map((chunk) => chunk.endDate)).toEqual([
      "2026-06-02T10:00:00.000Z",
      "2026-06-04T10:00:00.000Z",
    ]);
  });

  it("returns an empty array when dates are empty", () => {
    const result = getClassificationByDateChunks({
      dates: [],
      days: 7,
      data: [createEcosystemHealthItem("2026-06-01T10:00:00.000Z", 90)],
    });
    expect(result).toEqual([]);
  });

  it("returns an empty array when the day span is invalid", () => {
    const result = getClassificationByDateChunks({
      dates: ["2026-06-01T10:00:00.000Z"],
      days: 0,
      data: [createEcosystemHealthItem("2026-06-01T10:00:00.000Z", 90)],
    });
    expect(result).toEqual([]);
  });

  it("returns only complete Monday to Sunday calendar week chunks when rolling is false", () => {
    const result = getClassificationByDateChunks({
      days: 7,
      rolling: false,
      dates: [
        "2026-06-18T10:00:00.000Z",
        "2026-06-08T10:00:00.000Z",
        "2026-06-22T10:00:00.000Z",
        "2026-06-14T10:00:00.000Z",
        "2026-06-16T10:00:00.000Z",
        "2026-06-09T10:00:00.000Z",
        "2026-06-10T10:00:00.000Z",
        "2026-06-11T10:00:00.000Z",
        "2026-06-12T10:00:00.000Z",
        "2026-06-13T10:00:00.000Z",
        "2026-06-15T10:00:00.000Z",
        "2026-06-17T10:00:00.000Z",
        "2026-06-19T10:00:00.000Z",
        "2026-06-20T10:00:00.000Z",
        "2026-06-21T10:00:00.000Z",
        "2026-06-23T10:00:00.000Z",
      ],
      data: [
        createEcosystemHealthItem("2026-06-08T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-09T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-14T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-15T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-16T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-17T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-18T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-21T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-22T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-23T10:00:00.000Z", 10),
      ],
    });

    expect(result).toEqual([
      {
        startDate: "2026-06-08",
        endDate: "2026-06-14",
        days: 7,
        classification: {
          organic: {
            count: 1,
            trend: 100,
          },
          mixed: {
            count: 1,
            trend: 100,
          },
          automation: {
            count: 1,
            trend: 100,
          },
        },
      },
      {
        startDate: "2026-06-15",
        endDate: "2026-06-21",
        days: 7,
        classification: {
          organic: {
            count: 2,
            trend: 100,
          },
          mixed: {
            count: 1,
            trend: 0,
          },
          automation: {
            count: 2,
            trend: 100,
          },
        },
      },
    ]);
  });
});

describe("getWeeklyClassification", () => {
  it("uses a rolling 7 day window by default", () => {
    const result = getWeeklyClassification(
      [
        createEcosystemHealthItem("2026-06-05T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-06T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-07T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-08T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-12T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-13T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-14T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-15T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-16T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-18T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-19T10:00:00.000Z", 90),
      ],
      "2026-06-18T18:30:00.000Z",
    );

    expect(result).toEqual({
      organic: {
        count: 2,
        trend: 100,
      },
      mixed: {
        count: 1,
        trend: -50,
      },
      automation: {
        count: 3,
        trend: 200,
      },
    });
  });

  it("uses a rolling 7 day window when rolling is true", () => {
    const result = getWeeklyClassification(
      [
        createEcosystemHealthItem("2026-06-05T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-06T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-07T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-08T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-12T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-13T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-14T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-15T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-16T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-18T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-19T10:00:00.000Z", 90),
      ],
      "2026-06-18T18:30:00.000Z",
      true,
    );

    expect(result).toEqual({
      organic: {
        count: 2,
        trend: 100,
      },
      mixed: {
        count: 1,
        trend: -50,
      },
      automation: {
        count: 3,
        trend: 200,
      },
    });
  });

  it("uses full Monday to Sunday weeks when rolling is false", () => {
    const result = getWeeklyClassification(
      [
        createEcosystemHealthItem("2026-06-08T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-09T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-10T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-14T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-15T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-16T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-17T10:00:00.000Z", 50),
        createEcosystemHealthItem("2026-06-18T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-21T10:00:00.000Z", 10),
        createEcosystemHealthItem("2026-06-07T10:00:00.000Z", 90),
        createEcosystemHealthItem("2026-06-22T10:00:00.000Z", 90),
      ],
      "2026-06-18T18:30:00.000Z",
      false,
    );

    expect(result).toEqual({
      organic: {
        count: 2,
        trend: 100,
      },
      mixed: {
        count: 1,
        trend: -50,
      },
      automation: {
        count: 2,
        trend: 100,
      },
    });
  });
});
