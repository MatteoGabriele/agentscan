import type {
  EcosystemHealthItem,
  EcosystemHealthCategoryProgression,
} from "~~/shared/types/ecosystem-health";
import { unpack } from "~~/shared/utils/compactor";

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage("assets:data").getItemRaw("scan-results.txt");

    if (!raw) {
      throw new Error("scan-results.txt not found");
    }

    const content = Buffer.isBuffer(raw) ? raw.toString("utf-8") : String(raw);
    const results: EcosystemHealthItem[] = unpack(content);

    const automation: number[] = [];
    const mixed: number[] = [];
    const organic: number[] = [];

    const countsByDate = countClassificationByDate(results);
    const dates = Object.keys(countsByDate).sort();

    dates.forEach((date) => {
      const counts = countsByDate[date];
      if (!counts) return;

      automation.push(counts.automation.count);
      mixed.push(counts.mixed.count);
      organic.push(counts.organic.count);

      counts.automation.trend = calcLinearProgression(automation).trend;
      counts.mixed.trend = calcLinearProgression(mixed).trend;
      counts.organic.trend = calcLinearProgression(organic).trend;
    });

    const categoryProgression: EcosystemHealthCategoryProgression = {
      automation: calcLinearProgression(automation),
      mixed: calcLinearProgression(mixed),
      organic: calcLinearProgression(organic),
    };

    return {
      results,
      categoryProgression,
      countsByDate,
      dates,
    };
  } catch (error) {
    console.error("Ecosystem health fetch error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
