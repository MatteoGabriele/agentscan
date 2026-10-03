export function round(n: number, rounding = 2) {
  const factor = 10 ** rounding
  return Math.round(n * factor) / factor
}

export function formatCompactNumber(n: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle]
  const lower = sorted[middle - 1]

  if (upper === undefined) {
    return null
  }

  if (sorted.length % 2 || lower === undefined) {
    return upper
  }

  return (lower + upper) / 2
}
