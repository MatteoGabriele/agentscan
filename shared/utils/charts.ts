export function getCompleteDayRange(days: string[]): string[] {
  if (!days.length) {
    return []
  }

  const firstDay = days[0]!
  const lastDay = days[days.length - 1]!
  const firstDayTime = new Date(firstDay).getTime()
  const lastDayTime = new Date(lastDay).getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const completeDays: string[] = []

  for (let time = firstDayTime; time <= lastDayTime; time += oneDay) {
    completeDays.push(new Date(time).toISOString().slice(0, 10))
  }

  return completeDays
}

export function getDayKey(date: string | Date) {
  if (typeof date === 'string') {
    return date.slice(0, 10)
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * SVG markup fragments based on related Lucide icons.
 *
 * Render an icon using `v-html` inside an SVG `<g>` element.
 * Apply stroke, fill, and transformation attributes to the `<g>` element.
 *
 * @example
 * ```vue
 * <g
 *   transform="translate(-7.68, -7.68) scale(0.64)"
 *   stroke="currentColor"
 *   stroke-width="2"
 *   stroke-linecap="round"
 *   stroke-linejoin="round"
 *   fill="none"
 *   v-html="landmark.iconSvg"
 * />
 * ```
 * To extend the list of icons, add the lucide icon key, copy the svg from lucide website, and only keep the SVG elements (not the wrapping <svg> tag basically)
 *
 */
export const SVG_ICON = {
  info: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
  newspaper: `<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect stroke="currentColor" width="8" height="4" x="10" y="6" rx="1"/>`,
  shieldCheck: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
}
