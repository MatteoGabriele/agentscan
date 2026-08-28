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
