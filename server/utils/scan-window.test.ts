import { describe, expect, it, vi } from 'vitest'
import { currentScanWindow } from './scan-window'

const at = (iso: string) => vi.setSystemTime(new Date(iso))

describe('currentScanWindow', () => {
  it('still reports the previous hour until the scan has landed', () => {
    vi.useFakeTimers()
    at('2026-08-28T14:09:00Z')
    expect(currentScanWindow('hour')).toBe('2026-08-28T13')

    at('2026-08-28T14:10:00Z')
    expect(currentScanWindow('hour')).toBe('2026-08-28T14')
    vi.useRealTimers()
  })

  it('still reports the previous day until the rollup has landed', () => {
    vi.useFakeTimers()
    at('2026-08-28T00:09:00Z')
    expect(currentScanWindow('day')).toBe('2026-08-27')

    at('2026-08-28T00:10:00Z')
    expect(currentScanWindow('day')).toBe('2026-08-28')
    vi.useRealTimers()
  })

  it('holds the same day key across the rest of the day', () => {
    vi.useFakeTimers()
    at('2026-08-28T00:10:00Z')
    const key = currentScanWindow('day')

    at('2026-08-28T23:59:00Z')
    expect(currentScanWindow('day')).toBe(key)
    vi.useRealTimers()
  })
})
