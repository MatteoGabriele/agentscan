export function useScoreStyle(score: MaybeRef<number | undefined>) {
  const scoreClasses = computed(() => {
    const scoreValue = toValue(score);

    if (typeof scoreValue === "undefined") {
      return {
        text: "text-gray-500",
        border: "border-gray-500",
        bg: "bg-gray-500",
      };
    }

    if (scoreValue >= CONFIG.THRESHOLD_HUMAN) {
      return {
        text: "text-green-500",
        border: "border-green-500",
        bg: "bg-green-500",
      };
    }

    if (scoreValue >= CONFIG.THRESHOLD_SUSPICIOUS) {
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

  return {
    scoreClasses,
  };
}
