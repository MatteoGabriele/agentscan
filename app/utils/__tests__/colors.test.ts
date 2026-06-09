import { describe, it, expect } from "vitest";
import {
  clamp,
  hexToRgb,
  rgbToHex,
  interpolate,
  interpolateHexColors,
} from "../colors";

describe("clamp", () => {
  it("returns the value unchanged when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the minimum when below range", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("clamps to the maximum when above range", () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it("returns the boundary values exactly", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("hexToRgb", () => {
  it("converts an uppercase hex with a leading hash to RGB", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("converts black to all zero channels", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("converts a hex without a leading hash", () => {
    expect(hexToRgb("ff8800")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("accepts lowercase hex digits", () => {
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("parses each channel independently", () => {
    expect(hexToRgb("#102030")).toEqual({ r: 16, g: 32, b: 48 });
  });

  it("throws on a hex string that is too short", () => {
    expect(() => hexToRgb("#fff")).toThrow("Invalid hex color: #fff");
  });

  it("throws on a hex string that is too long", () => {
    expect(() => hexToRgb("#1234567")).toThrow();
  });

  it("throws on non-hex characters", () => {
    expect(() => hexToRgb("#gggggg")).toThrow("Invalid hex color: #gggggg");
  });

  it("throws on an empty string", () => {
    expect(() => hexToRgb("")).toThrow();
  });
});

describe("rgbToHex", () => {
  it("converts white back to hex", () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
  });

  it("converts black back to hex", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  it("zero-pads single-digit channel values", () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe("#010203");
  });

  it("rounds fractional channel values to the nearest integer", () => {
    // Math.round: 0.5 -> 1 (0x01), 254.6 -> 255 (0xff), 15.9 -> 16 (0x10)
    expect(rgbToHex({ r: 0.5, g: 254.6, b: 15.9 })).toBe("#01ff10");
  });

  it("round-trips with hexToRgb", () => {
    expect(rgbToHex(hexToRgb("#ff8800"))).toBe("#ff8800");
  });
});

describe("interpolate", () => {
  const from = { r: 0, g: 0, b: 0 };
  const to = { r: 255, g: 255, b: 255 };

  it("returns the start color at amount 0", () => {
    expect(interpolate(from, to, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns the end color at amount 1", () => {
    expect(interpolate(from, to, 1)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns the midpoint at amount 0.5", () => {
    expect(interpolate({ r: 0, g: 0, b: 0 }, { r: 100, g: 200, b: 50 }, 0.5)).toEqual({
      r: 50,
      g: 100,
      b: 25,
    });
  });

  it("interpolates each channel independently", () => {
    expect(interpolate({ r: 10, g: 20, b: 30 }, { r: 20, g: 40, b: 90 }, 0.5)).toEqual({
      r: 15,
      g: 30,
      b: 60,
    });
  });

  it("extrapolates beyond the end when amount exceeds 1 (no internal clamp)", () => {
    // interpolate itself does not clamp; only interpolateHexColors clamps the ratio
    expect(interpolate({ r: 0, g: 0, b: 0 }, { r: 100, g: 100, b: 100 }, 2)).toEqual({
      r: 200,
      g: 200,
      b: 200,
    });
  });
});

describe("interpolateHexColors", () => {
  it("returns the only color when a single color is given", () => {
    expect(interpolateHexColors({ colors: ["#abcdef"], ratio: 0.5 })).toBe("#abcdef");
  });

  it("returns the first color at ratio 0", () => {
    expect(
      interpolateHexColors({ colors: ["#000000", "#ffffff"], ratio: 0 }),
    ).toBe("#000000");
  });

  it("returns the last color at ratio 1", () => {
    expect(
      interpolateHexColors({ colors: ["#000000", "#ffffff"], ratio: 1 }),
    ).toBe("#ffffff");
  });

  it("returns the midpoint of two colors at ratio 0.5", () => {
    expect(
      interpolateHexColors({ colors: ["#000000", "#ffffff"], ratio: 0.5 }),
    ).toBe("#808080");
  });

  it("clamps a ratio above 1 to the last color", () => {
    expect(
      interpolateHexColors({ colors: ["#000000", "#ffffff"], ratio: 2 }),
    ).toBe("#ffffff");
  });

  it("clamps a negative ratio to the first color", () => {
    expect(
      interpolateHexColors({ colors: ["#000000", "#ffffff"], ratio: -1 }),
    ).toBe("#000000");
  });

  it("lands on the middle stop of a three-color gradient at ratio 0.5", () => {
    expect(
      interpolateHexColors({
        colors: ["#000000", "#808080", "#ffffff"],
        ratio: 0.5,
      }),
    ).toBe("#808080");
  });

  it("interpolates within the first segment of a three-color gradient", () => {
    // ratio 0.25 -> scaled 0.5 across segment 0 (black -> gray) -> #404040
    expect(
      interpolateHexColors({
        colors: ["#000000", "#808080", "#ffffff"],
        ratio: 0.25,
      }),
    ).toBe("#404040");
  });

  it("returns the first color of a multi-color gradient at ratio 0", () => {
    expect(
      interpolateHexColors({
        colors: ["#000000", "#808080", "#ffffff"],
        ratio: 0,
      }),
    ).toBe("#000000");
  });

  it("returns the last color of a multi-color gradient at ratio 1", () => {
    expect(
      interpolateHexColors({
        colors: ["#000000", "#808080", "#ffffff"],
        ratio: 1,
      }),
    ).toBe("#ffffff");
  });

  it("throws when colors is not an array", () => {
    expect(() =>
      interpolateHexColors({
        colors: null as unknown as string[],
        ratio: 0.5,
      }),
    ).toThrow("colors must be an array with at least 2 hex colors");
  });

  it("propagates the hex validation error for an invalid color stop", () => {
    expect(() =>
      interpolateHexColors({ colors: ["#000000", "nothex"], ratio: 0.5 }),
    ).toThrow("Invalid hex color: nothex");
  });
});
