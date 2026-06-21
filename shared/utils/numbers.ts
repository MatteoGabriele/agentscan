export function round(n: number, rounding = 2) {
  const factor = 10 ** rounding;
  return Math.round(n * factor) / factor;
}
