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

        if (dist <= CLASSIFICATION_PROXIMITY_THRESHOLD) {
          return "mixed";
        }

        return;
      }

      if (scoreValue >= identityConfig.THRESHOLD_SUSPICIOUS) {
        const dist = scoreValue - identityConfig.THRESHOLD_SUSPICIOUS;

        if (dist <= CLASSIFICATION_PROXIMITY_THRESHOLD) {
          return "automation";
        }
      }
    },
  );

  return {
    nearestClassification,
  };
}
