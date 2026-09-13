import { describe, it, expect } from 'vitest'
import { closesLines } from '../publish-automations'

describe('closesLines', () => {
  it('writes one closing keyword per report, oldest first', () => {
    expect(closesLines([345, 123])).toBe('closes #123\ncloses #345')
  })

  it('renders a single report without a trailing newline', () => {
    expect(closesLines([123])).toBe('closes #123')
  })
})
