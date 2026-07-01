// @unocss-include
import type { FlagDataPoint } from '@unveil/identity'

const ICON_RULES: [string[], string][] = [
  [['branch'], 'i-lucide:git-branch'],
  [['fork'], 'i-lucide:git-fork'],
  [['merge', 'merged'], 'i-lucide:git-merge'],
  [['pr', 'pull request'], 'i-lucide:git-pull-request'],
  [['closed'], 'i-lucide:git-pull-request-closed'],
  [['star', 'watch'], 'i-lucide:star'],
  [['comment'], 'i-lucide:message-square'],
  [['push'], 'i-lucide:upload'],
  [['repo'], 'i-lucide:folder-git-2'],
  [['bounty'], 'i-lucide:trophy'],
  [['ratio', '%'], 'i-lucide:percent'],
  [['entropy', 'diversity', 'types'], 'i-lucide:layers'],
  [['age', 'date'], 'i-lucide:calendar'],
  [
    ['hour', 'interval', 'gap', 'window', 'span', '(s)', '(min)'],
    'i-lucide:timer',
  ],
  [['consecutive', 'rapid', 'burst'], 'i-lucide:zap'],
  [['event', 'activity'], 'i-lucide:activity'],
]

export function useFlagDataPoints() {
  function getDataPointIcon(label: string): string {
    const l = label.toLowerCase()
    return (
      ICON_RULES.find(([keywords]) =>
        keywords.some((k) => l.includes(k)),
      )?.[1] ?? 'i-lucide:bar-chart-2'
    )
  }

  function parseDataPoint(point: FlagDataPoint): {
    label: string
    displayValue: string
    displayThreshold: string | undefined
  } {
    const unitMatch = point.label.match(/^(.*?)\s*\(([^)]+)\)$/)
    if (!unitMatch) {
      return {
        label: point.label,
        displayValue: String(point.value),
        displayThreshold:
          point.threshold !== undefined ? String(point.threshold) : undefined,
      }
    }

    const [, cleanLabel, unit] = unitMatch as [string, string, string]
    const withUnit = (val: FlagDataPoint['value']) => {
      if (typeof val === 'boolean') {
        return String(val)
      }
      const n = parseFloat(String(val))
      return !isNaN(n) ? `${val}${unit}` : String(val)
    }

    return {
      label: cleanLabel,
      displayValue: withUnit(point.value),
      displayThreshold:
        point.threshold !== undefined ? withUnit(point.threshold) : undefined,
    }
  }

  function groupDataPoints(
    data: FlagDataPoint[],
  ): { icon: string; points: FlagDataPoint[] }[] {
    const groups: { icon: string; points: FlagDataPoint[] }[] = []

    for (const point of data) {
      const icon = getDataPointIcon(point.label)
      const last = groups[groups.length - 1]

      if (last && last.icon === icon) {
        last.points.push(point)
      } else {
        groups.push({ icon, points: [point] })
      }
    }

    return groups
  }

  return {
    getDataPointIcon,
    parseDataPoint,
    groupDataPoints,
  }
}
