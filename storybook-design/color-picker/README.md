# ColorPicker

Compact HSL colour picker, extracted from the sandbox (`feature-2/Panel.tsx` → `ColorRow`).
A row of "label + hex + swatch"; clicking the swatch opens a popover with a 2D
saturation/lightness area, a hue strip, an alpha strip (over a checkerboard),
numeric H / S / L / A fields, and a HEX + alpha row.

## Dependencies

1. **React** 17+ (hooks: `useState`, `useEffect`, `useRef`).
2. No styling framework required — every colour, size, border and gradient is
   set via inline `style`. Only a handful of ubiquitous layout utility classes
   (`flex`, `items-center`, `gap-2`) are used, so the component renders
   correctly even where Tailwind isn't scanning the file and Preflight is off.
3. No store, no third-party colour libraries — everything lives in two files.

## Files

1. `color-hsl.ts` — the `Hsl` model and `hexToHsl` / `hslToHex` conversions
   (accept `#rrggbb` and `#rrggbbaa`; always emit `#rrggbbaa`).
2. `ColorPicker.tsx` — the component itself (controlled) plus the internal
   `SlArea` / `HueStrip` / `AlphaStrip`.
3. `index.ts` — the import barrel.

## Usage

The component is **controlled**: the parent owns the hex string, and the picker
returns a new one via `onChange`.

```tsx
import { useState } from "react";
import { ColorPicker } from "./color-picker";

function Example() {
  const [color, setColor] = useState("#3b82f6cc");
  return <ColorPicker label="Body color" value={color} onChange={setColor} />;
}
```

`onChange` fires on every edit and always returns `#rrggbbaa` (the alpha byte is
always present). It accepts both `#rrggbb` and `#rrggbbaa` as input.

Pass `tone="dark"` to style the trigger row and popover for a dark surface;
the default is `light`.

## Behaviour notes

1. The live HSL triple is kept in local state because `hex→HSL` loses H and S
   on greys/white (otherwise the sliders would collapse to zero). It resyncs
   from `value` only on an EXTERNAL change (one this control didn't produce).
2. The popover closes on an outside click and on Escape.
3. The 2D area is "true" HSL: top = white (L=100), bottom = black (L=0), the
   pure hue sits mid-height (L=50), saturation runs left→right.
4. The HEX field holds the RGB triple as `#rrggbb` in local text so partial /
   invalid typing doesn't fight the model; it commits back only on a valid
   6-digit hex, preserving the current alpha.
