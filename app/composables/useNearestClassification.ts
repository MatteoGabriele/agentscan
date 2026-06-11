import { identityConfig } from "@unveil/identity";

export type UseNearestClassificationReturn = {
  nearestClassification: ComputedRef<IdentityClassification | undefined>;
};

const CLASSIFICATION_PROXIMITY_THRESHOLD = 15;

export function useNearestClassification(
  score: MaybeRefOrGetter<number | undefined>,
): UseNearestClassificationReturn {
  const nearestClassification = computed<IdentityClassification | undefined>(
    () => {
      const scoreValue = toValue(score);

      if (scoreValue === undefined) {
        return;
      }

      if (scoreValue >= identityConfig.THRESHOLD_HUMAN) {
        const dist = scoreValue - identityConfig.THRESHOLD_HUMAN;
        return dist <= CLASSIFICATION_PROXIMITY_THRESHOLD ? "mixed" : undefined;
      }

      if (scoreValue >= identityConfig.THRESHOLD_SUSPICIOUS) {
        const distToAutomation =
          scoreValue - identityConfig.THRESHOLD_SUSPICIOUS;
        const distToOrganic = identityConfig.THRESHOLD_HUMAN - scoreValue;

        if (distToAutomation <= CLASSIFICATION_PROXIMITY_THRESHOLD) {
          return "automation";
        }

        if (distToOrganic <= CLASSIFICATION_PROXIMITY_THRESHOLD) {
          return "organic";
        }

        return;
      }

      const dist = identityConfig.THRESHOLD_SUSPICIOUS - scoreValue;
      return dist <= CLASSIFICATION_PROXIMITY_THRESHOLD ? "mixed" : undefined;
    },
  );

  return {
    nearestClassification,
  };
}
