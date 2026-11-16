import { identityConfig } from '@unveil/identity'

/**
 * How much activity the analysis covered, from `confidence` (event count and
 * day span). Not a measure of classification certainty.
 */
export type DataCoverageLevel = 'full' | 'partial' | 'low'

export type UseDataCoverageReturn = {
  coverageLevel: ComputedRef<DataCoverageLevel | undefined>
}

const FULL_COVERAGE_THRESHOLD = 0.7

export function useDataCoverage(
  confidence: MaybeRefOrGetter<number | undefined>,
): UseDataCoverageReturn {
  const coverageLevel = computed<DataCoverageLevel | undefined>(() => {
    const confidenceValue = toValue(confidence)

    if (confidenceValue === undefined) {
      return
    }

    if (confidenceValue >= FULL_COVERAGE_THRESHOLD) {
      return 'full'
    }

    if (confidenceValue >= identityConfig.CONFIDENCE_MIN_FOR_RESULT) {
      return 'partial'
    }

    return 'low'
  })

  return {
    coverageLevel,
  }
}
