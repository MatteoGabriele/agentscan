type ClassificationDetails = {
  label: string;
  description: string;
};

export function useClassificationDetails(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
) {
  const classificationDetails = computed<ClassificationDetails>(() => {
    const classificationValue = toValue(classification);

    if (!classificationValue) {
      return {
        label: "Analysis unavailable",
        description: "Classification is not available for this account.",
      };
    }

    if (classificationValue === "organic") {
      return {
        label: "Organic activity",
        description: "No automation signals detected in the analyzed events.",
      };
    }

    if (classificationValue === "mixed") {
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
