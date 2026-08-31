import type { NuxtApp } from '#app'

type CachedDataContext = {
  cause: 'initial' | 'refresh:manual' | 'refresh:hook' | 'watch'
}

export function payloadCachedData<T>(
  key: string,
  nuxtApp: NuxtApp,
  ctx: CachedDataContext,
): T | undefined {
  if (ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook') {
    return undefined
  }

  return (nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]) as
    | T
    | undefined
}
