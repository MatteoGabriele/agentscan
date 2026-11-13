// @unocss-include
export type ErrorTone = 'neutral' | 'notice' | 'critical'

export type ErrorDetails = {
  icon: string
  tone: ErrorTone
  title: string
  description: string
  hint?: string
  statusCode?: number
  detail?: string
  canRetry: boolean
}

type ErrorLike = {
  statusCode?: number
  message?: string
  data?: {
    message?: string
  }
}

export function useErrorDetails(error: MaybeRefOrGetter<unknown>): {
  errorDetails: ComputedRef<ErrorDetails>
} {
  const errorDetails = computed<ErrorDetails>(() => {
    const { statusCode, message, data } = (toValue(error) ?? {}) as ErrorLike
    const rawDetail = data?.message ?? message
    const base = {
      statusCode,
      detail:
        typeof rawDetail === 'string'
          ? rawDetail.trim() || undefined
          : undefined,
    }

    if (statusCode === 400) {
      return {
        ...base,
        icon: 'i-lucide:circle-slash',
        tone: 'notice',
        title: 'This account name is not valid',
        description:
          'The account name in the address is not something we can look up on GitHub.',
        hint: 'Check the spelling, or search for the account again.',
        canRetry: false,
      }
    }

    if (statusCode === 401 || statusCode === 403) {
      return {
        ...base,
        icon: 'i-lucide:lock',
        tone: 'critical',
        title: 'GitHub refused the request',
        description: 'This account could not be analyzed right now.',
        hint: 'Nothing is wrong with the account itself.',
        canRetry: true,
      }
    }

    if (statusCode === 404) {
      return {
        ...base,
        icon: 'i-lucide:ghost',
        tone: 'neutral',
        title: 'Account not found',
        description:
          'GitHub has no public account under this name. It may have been renamed, deleted, or simply mistyped.',
        canRetry: false,
      }
    }

    if (statusCode === 429) {
      return {
        ...base,
        icon: 'i-lucide:hourglass',
        tone: 'notice',
        title: 'Rate limit reached',
        description:
          'AgentScan reads the public GitHub API, and its quota is used up for the moment. It refills within the hour.',
        hint: 'Nothing is wrong with this account. Try again in a few minutes.',
        canRetry: true,
      }
    }

    if (statusCode && statusCode >= 500) {
      return {
        ...base,
        icon: 'i-lucide:unplug',
        tone: 'critical',
        title: 'The analysis could not finish',
        description:
          "GitHub answered, but we could not finish reading this account's activity.",
        hint: 'This is usually temporary.',
        canRetry: true,
      }
    }

    return {
      ...base,
      icon: 'i-lucide:cloud-off',
      tone: 'critical',
      title: 'Could not load the analysis',
      description:
        'The request never made it through. This is usually a short network problem.',
      hint: 'Check your connection, then try again.',
      canRetry: true,
    }
  })

  return {
    errorDetails,
  }
}
