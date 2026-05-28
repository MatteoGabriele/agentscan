export type RGB = {
  r: number;
  g: number;
  b: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");

  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB) {
  return (
    "#" +
    [r, g, b]
      .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function interpolate(from: RGB, to: RGB, amount: number) {
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  };
}

export function interpolateHexColors({
  colors,
  ratio,
}: {
  colors: string[];
  ratio: number;
}): string {
  if (!Array.isArray(colors)) {
    throw new Error("colors must be an array with at least 2 hex colors");
  }

  if (colors.length === 1) return colors[0]!;

  const normalizedRatio = clamp(ratio, 0, 1);
  const rgbColors = colors.map(hexToRgb);
  const segmentCount = rgbColors.length - 1;
  const scaledRatio = normalizedRatio * segmentCount;
  const segmentIndex = Math.min(Math.floor(scaledRatio), segmentCount - 1);
  const localRatio = scaledRatio - segmentIndex;
  const startColor = rgbColors[segmentIndex]!;
  const endColor = rgbColors[segmentIndex + 1]!;

  return rgbToHex(interpolate(startColor, endColor, localRatio));
}
