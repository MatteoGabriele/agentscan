export function useClassification(score?: MaybeRefOrGetter<number>) {
  const scoreValue = computed<number>(() => {
    return toValue(score) ?? 0;
  });

  const classes = computed(() => {
    if (scoreValue.value >= CONFIG.THRESHOLD_HUMAN) {
      return {
        text: "text-green-500",
        border: "border-green-500",
        bg: "bg-green-500",
      };
    }

    if (scoreValue.value >= CONFIG.THRESHOLD_SUSPICIOUS) {
      return {
        text: "text-amber-500",
        border: "border-amber-500",
        bg: "bg-amber-500",
      };
    }

    return {
      text: "text-red-500",
      border: "border-red-500",
      bg: "bg-red-500",
    };
  });

  const label = computed<string>(() => {
    if (scoreValue.value >= CONFIG.THRESHOLD_HUMAN) {
      return "Human";
    }

    if (scoreValue.value >= CONFIG.THRESHOLD_SUSPICIOUS) {
      return "Suspiscious";
    }

    return "Likely Bot";
  });

  const icon = computed<string>(() => {
    if (scoreValue.value >= CONFIG.THRESHOLD_HUMAN) {
      return "i-carbon-face-satisfied";
    }

    if (scoreValue.value >= CONFIG.THRESHOLD_SUSPICIOUS) {
      return "i-carbon-warning";
    }

    return "i-carbon-machine-learning";
  });

  return {
    classes,
    icon,
    label,
  };
}
