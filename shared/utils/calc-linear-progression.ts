export function calcLinearProgression(values: number[]) {
  const len = values?.length ?? 0

  if (len < 2) {
    return {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      slope: 0,
      trend: 0,
    }
  }

  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0

  for (let i = 0; i < len; i += 1) {
    const x = i
    const y = values[i] ?? 0

    sx += x
    sy += y
    sxy += x * y
    sxx += x * x
  }

  const denominator = len * sxx - sx * sx || 1
  const slope = (len * sxy - sx * sy) / denominator
  const intercept = (sy - slope * sx) / len

  const x1 = 0
  const x2 = len - 1
  const y1 = intercept
  const y2 = slope * x2 + intercept

  const average = sy / len

  const EPS = 1e-9
  const scale = Math.max(Math.abs(y1), Math.abs(average), Math.abs(y2), EPS)

  const trend = (y2 - y1) / scale

  return {
    x1,
    y1,
    x2,
    y2,
    slope,
    trend,
  }
}
