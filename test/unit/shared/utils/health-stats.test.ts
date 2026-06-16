import { describe, expect, it } from "vitest";
import {
  formatTrend,
  getHealthStats,
} from "../../../../shared/utils/health-stats";
import { MOCK_ECOSYSTEM_HEALTH_ITEMS } from "../../mocks/ecosystemHealthItems";

describe("formatTrend", () => {
  it("formats a ratio to a signed and rounded percentage string", () => {
    expect(formatTrend(-1.5)).toEqual("-150%");
    expect(formatTrend(-1)).toEqual("-100%");
    expect(formatTrend(-0.5)).toEqual("-50%");
    expect(formatTrend(-0.33)).toEqual("-33%");
    expect(formatTrend(-0.339)).toEqual("-34%");
    expect(formatTrend(-0.333)).toEqual("-33%");
    expect(formatTrend(0)).toEqual("0%");
    expect(formatTrend(0.333)).toEqual("+33%");
    expect(formatTrend(0.339)).toEqual("+34%");
    expect(formatTrend(0.33)).toEqual("+33%");
    expect(formatTrend(0.5)).toEqual("+50%");
    expect(formatTrend(1)).toEqual("+100%");
    expect(formatTrend(1.5)).toEqual("+150%");
  });
});

describe("getHealthStats", () => {
  it("returns a classified dataset from ecosystem data", () => {
    const result = getHealthStats(MOCK_ECOSYSTEM_HEALTH_ITEMS);
    Object.values(result!).forEach(() => {
      expect.objectContaining({
        count: expect.any(Number),
        percentage: expect.any(String),
      });
    });
  });
});
