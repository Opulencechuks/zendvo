import {
  secondaryDisabledBg,
  secondaryDisabledText,
} from "../src/components/buttonColors";

// helpers
function hexToRgb(hex: string) {
  // Support #RRGGBB and #RGB
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  // Fallback
  throw new Error(`Unsupported hex color: ${hex}`);
}

function srgbToLinear(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1: string, hex2: string) {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

describe("Button disabled color contrast", () => {
  test("secondary disabled text/background meet >= 3:1 WCAG AA legibility", () => {
    const ratio = contrastRatio(secondaryDisabledText, secondaryDisabledBg);
    console.log("Contrast ratio (secondary disabled):", ratio);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});
