export interface DevTokenPanelConfig {
  enabled: boolean
  refreshInterval: number
}

export interface DevTokenPanelToken {
  env: string
  label: string
}

export const devTokenResources = ['core', 'search', 'graphql'] as const

export type DevTokenResource = (typeof devTokenResources)[number]

export interface DevTokenResourceUsage {
  limit: number
  used: number
  remaining: number
  reset: number
}

export interface DevTokenUsage {
  name: string
  error: string | null
  resources: Partial<Record<DevTokenResource, DevTokenResourceUsage>>
}

export interface DevTokenUsageResponse {
  fetchedAt: number
  tokens: DevTokenUsage[]
}
