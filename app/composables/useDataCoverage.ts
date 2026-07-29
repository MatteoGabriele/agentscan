import { identityConfig } from '@unveil/identity'

/**
 * How much activity was available to analyze. Derived from the analysis
 * `confidence`, which counts events and the days they span, not how certain
 * the classification is.
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
