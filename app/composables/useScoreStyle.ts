// @unocss-include
import type { IdentityClassification } from '@unveil/identity'

type ScoreStyle = {
  text: string
  border: string
  background: string
}

type UseScoreStyle = {
  scoreStyle: ComputedRef<ScoreStyle>
}

type UseScoreStyleOptions = {
  hasCommunityFlag?: boolean
  hasActivityReport?: boolean
}

export function useScoreStyle(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
  options?: MaybeRefOrGetter<UseScoreStyleOptions>,
): UseScoreStyle {
  const scoreStyle = computed<ScoreStyle>(() => {
    const classificationValue = toValue(classification)
    const opts = toValue(options)

    if (opts?.hasCommunityFlag) {
      return {
        text: 'text-gh-danger-hover',
        border: 'border-gh-danger-hover',
        background: 'bg-gh-danger-hover',
      }
    }

    if (!classificationValue) {
      return {
        text: 'text-gray-500',
        border: 'border-gray-500',
        background: 'bg-gray-500',
      }
    }

    if (classificationValue === 'automation') {
      return {
        text: 'text-gh-danger-hover',
        border: 'border-gh-danger-hover',
        background: 'bg-gh-danger-hover',
      }
    }

    if (classificationValue === 'mixed' || opts?.hasActivityReport) {
      return {
        text: 'text-amber-500',
        border: 'border-amber-500',
        background: 'bg-amber-500',
      }
    }

    return {
      text: 'text-green-500',
      border: 'border-green-500',
      background: 'bg-green-500',
    }
  })

  return {
    scoreStyle,
  }
}
