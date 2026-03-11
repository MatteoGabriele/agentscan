import { getClassificationDetails } from "~~/shared/utils/voight-kampff-test/classification-details";

type ClassificationDetails = {
  label: string;
  description: string;
};

export function useClassificationDetails(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
) {
  const classificationDetails = computed<ClassificationDetails>(() => {
    const classificationValue = toValue(classification);
    return getClassificationDetails(classificationValue);
  });

  return {
    classificationDetails,
  };
}
