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
  layers: `<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>`,
  shieldCheck: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
  triangleAlert: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
}

export const EMPTY_HOUR_NOTE =
  'No pull requests recorded. Probably a GitHub outage that stopped the hourly scan.'

export const PR_VOLUME_DASH_ARRAY = '0.1 4'
export const PR_VOLUME_STROKE_WIDTH = 2
