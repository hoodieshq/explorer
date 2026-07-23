/** HSL(A) colour model + lossless-ish conversions to/from `#rrggbb(aa)` hex.
 *
 *  Alpha is stored 0–100 (percent), hue 0–360, saturation/lightness 0–100.
 *  Hex is always emitted with an alpha byte: `#rrggbbaa`. The parser accepts
 *  both `#rrggbb` and `#rrggbbaa` (with or without the leading `#`). */
export interface Hsl {
  /** Hue 0–360. */
  h: number;
  /** Saturation 0–100. */
  s: number;
  /** Lightness 0–100. */
  l: number;
  /** Alpha 0–100 (100 = opaque). */
  a: number;
}

/** Parse `#rrggbb` or `#rrggbbaa` into HSL. Invalid input → opaque white.
 *  Note hex→HSL is lossy for greys/white (H and S collapse to 0); the picker
 *  works around that by keeping the live HSL triple in component state. */
export function hexToHsl(hex: string): Hsl {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 100, a: 100 };
  const a = m[2] ? Math.round((parseInt(m[2], 16) / 255) * 100) : 100;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100), a };
}

/** Serialise HSL to `#rrggbbaa` (alpha byte always present). */
export function hslToHex({ h, s, l, a }: Hsl): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  const aByte = Math.round((a / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${to(r!)}${to(g!)}${to(b!)}${aByte}`;
}
