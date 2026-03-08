import { CONFIG } from "~~/shared/utils/voight-kampff-test/config";

export function useClassificationDetails(score: MaybeRefOrGetter<number>) {
  const classificationDetails = computed(() => {
    const scoreValue = toValue(score);

    if (scoreValue >= CONFIG.THRESHOLD_HUMAN) {
      return {
        label: "Organic activity",
        description: "No automation signals detected in the analyzed events.",
      };
    }

    if (scoreValue >= CONFIG.THRESHOLD_SUSPICIOUS) {
      return {
        label: "Mixed activity",
        description:
          "Activity patterns show a mix of organic and automated signals.",
      };
    }

    return {
      label: "Automation signals",
      description: "Activity patterns show signs of automation.",
    };
  });

  return {
    classificationDetails,
  };
}
