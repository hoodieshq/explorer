import { useEffect, useRef, useState } from "react";
import { type Hsl, hexToHsl, hslToHex } from "./color-hsl";

// NOTE: consumed inside `storybook-design`, which Tailwind does NOT scan
// (`content: ['./app/**']`), and Preflight is off. So any utility class not
// also used under `app/` generates no CSS: sizing like `h-40`/`h-3`/`w-56` and
// the numeric fields silently collapse to zero, and unstyled inputs/buttons
// keep UA-default light backgrounds. Everything visual is therefore set via
// inline `style`; only trivial layout utilities are left as classes.

/** Shared thumb style for the draggable handles. */
const THUMB: React.CSSProperties = {
  border: "2px solid #fff",
  borderRadius: 9999,
  boxShadow: "0 0 0 1px rgba(156,163,175,0.9), 0 1px 2px rgba(0,0,0,0.45)",
  height: 14,
  pointerEvents: "none",
  position: "absolute",
  width: 14,
};

/** Clamp a pointer event to normalized 0..1 coordinates inside an element. */
function pointerNorm(e: React.PointerEvent, el: HTMLElement): { nx: number; ny: number } {
  const rect = el.getBoundingClientRect();
  return {
    nx: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    ny: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  };
}

/** 2D saturation/lightness area in TRUE HSL layout: the top edge is white
 *  (L=100), the bottom edge is black (L=0), the pure hue sits mid-height
 *  (L=50); saturation runs left→right. Built as a white→transparent→black
 *  vertical overlay over a grey→hue horizontal base. */
function SlArea({ hsl, onChange }: { hsl: Hsl; onChange: (s: number, l: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (e: React.PointerEvent) => {
    const { nx, ny } = pointerNorm(e, ref.current!);
    onChange(Math.round(nx * 100), Math.round((1 - ny) * 100));
  };
  return (
    <div
      ref={ref}
      style={{
        background: `linear-gradient(to bottom, #fff, rgba(255,255,255,0) 50%, rgba(0,0,0,0) 50%, #000), linear-gradient(to right, hsl(${hsl.h}, 0%, 50%), hsl(${hsl.h}, 100%, 50%))`,
        borderRadius: 6,
        cursor: "crosshair",
        height: 160,
        position: "relative",
        width: "100%",
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e);
      }}
    >
      <div
        style={{
          ...THUMB,
          backgroundColor: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          left: `${hsl.s}%`,
          top: `${100 - hsl.l}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

/** Horizontal hue strip (0–360 rainbow) with a draggable thumb. */
function HueStrip({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (e: React.PointerEvent) => {
    const { nx } = pointerNorm(e, ref.current!);
    onChange(Math.round(nx * 360));
  };
  return (
    <div
      ref={ref}
      style={{
        background:
          "linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)",
        borderRadius: 9999,
        cursor: "pointer",
        height: 12,
        position: "relative",
        width: "100%",
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e);
      }}
    >
      <div
        style={{
          ...THUMB,
          backgroundColor: `hsl(${hue}, 100%, 50%)`,
          left: `${(hue / 360) * 100}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

/** Horizontal alpha strip: transparent→opaque gradient of the current colour
 *  over a checkerboard, with a draggable thumb. */
function AlphaStrip({ hsl, onChange }: { hsl: Hsl; onChange: (a: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (e: React.PointerEvent) => {
    const { nx } = pointerNorm(e, ref.current!);
    onChange(Math.round(nx * 100));
  };
  const solid = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  return (
    <div
      ref={ref}
      style={{
        background: `linear-gradient(to right, transparent, ${solid}), repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 12px 12px`,
        borderRadius: 9999,
        cursor: "pointer",
        height: 12,
        position: "relative",
        width: "100%",
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e);
      }}
    >
      <div
        style={{
          ...THUMB,
          backgroundColor: solid,
          left: `${hsl.a}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

export interface ColorPickerProps {
  /** Row label shown to the left of the swatch. */
  label: string;
  /** Current colour as `#rrggbb` or `#rrggbbaa`. */
  value: string;
  /** Called with a `#rrggbbaa` hex string on every edit. */
  onChange: (hex: string) => void;
  /** Visual tone for BOTH the trigger row and the popover. Default `light`. */
  tone?: "light" | "dark";
}

/** A compact colour row (label + hex + swatch) that opens a POPOVER with the
 *  2D HSL picker (SlArea + HueStrip + AlphaStrip) and numeric H/S/L/A fields.
 *  The popover closes on an outside click or Escape.
 *
 *  Fully controlled: the parent owns the `#rrggbb(aa)` string, while the live
 *  HSL triple lives in local state so that greys/white don't snap H and S back
 *  to 0 (hex→HSL is lossy). It resyncs from `value` only on an EXTERNAL change
 *  (one this control didn't produce). */
export function ColorPicker({ label, value, onChange, tone = "light" }: ColorPickerProps) {
  const dark = tone === "dark";
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(value));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hslToHex(hsl).toLowerCase() !== value.toLowerCase()) setHsl(hexToHsl(value));
    // Resync on external changes only — local edits already keep the pair in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  // Dismiss the popover on an outside pointerdown or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const update = (patch: Partial<Hsl>) => {
    const next = { ...hsl, ...patch };
    setHsl(next);
    onChange(hslToHex(next));
  };
  // The HEX field holds the RGB triple as `#rrggbb` in local text (so partial /
  // invalid typing doesn't fight the model); it resyncs whenever the colour
  // changes from any other field, and commits back only on a valid 6-digit hex.
  const rgbHex = hslToHex(hsl).slice(0, 7);
  const [hexText, setHexText] = useState(rgbHex);
  useEffect(() => {
    setHexText(rgbHex);
  }, [rgbHex]);
  const onHexInput = (raw: string) => {
    setHexText(raw);
    const m = /^#?([0-9a-fA-F]{6})$/.exec(raw.trim());
    if (m) {
      const p = hexToHsl(`#${m[1]}`);
      update({ h: p.h, l: p.l, s: p.s }); // keep the current alpha
    }
  };
  const inputStyle: React.CSSProperties = {
    background: dark ? "rgba(255,255,255,0.06)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "#e5e7eb"}`,
    borderRadius: 4,
    color: dark ? "#fff" : "#374151",
    fontFamily: "monospace",
    fontSize: 11,
    padding: "2px 4px",
    textAlign: "center",
    width: "100%",
  };
  const captionStyle: React.CSSProperties = {
    color: dark ? "rgba(255,255,255,0.5)" : "#9ca3af",
    fontFamily: "monospace",
    fontSize: 10,
    textTransform: "uppercase",
  };
  const cell: React.CSSProperties = { alignItems: "center", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 };
  const field = (key: keyof Hsl, max: number) => (
    <label style={cell}>
      <input
        type="number"
        min={0}
        max={max}
        value={hsl[key]}
        onChange={(e) => {
          const v = Math.min(max, Math.max(0, Math.round(Number(e.target.value) || 0)));
          update({ [key]: v });
        }}
        style={inputStyle}
      />
      <span style={captionStyle}>{key}</span>
    </label>
  );
  const [hover, setHover] = useState(false);
  // Border lives on the swatch — the actual clickable trigger — so it reads as a button.
  const swatchBorder = dark
    ? hover || open
      ? "rgba(255,255,255,0.75)"
      : "rgba(255,255,255,0.4)"
    : hover || open
      ? "#6b7280"
      : "#9ca3af";
  return (
    <div ref={rootRef} style={{ position: "relative", paddingBottom: 4, paddingTop: 4 }}>
      <div className="flex w-full items-center justify-between">
        <span style={{ color: dark ? "rgba(255,255,255,0.75)" : "#4b5563", fontSize: 12 }}>{label}</span>
        <span className="flex items-center gap-2">
          <span style={{ color: dark ? "rgba(255,255,255,0.55)" : "#6b7280", fontFamily: "monospace", fontSize: 11 }}>
            {value}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="cursor-pointer"
            title={open ? "Close picker" : "Open picker"}
            style={{
              background: `linear-gradient(${value}, ${value}), repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 8px 8px`,
              border: `2px solid ${swatchBorder}`,
              borderRadius: 5,
              boxShadow: hover || open ? (dark ? "0 0 0 3px rgba(255,255,255,0.14)" : "0 0 0 3px rgba(0,0,0,0.08)") : "none",
              cursor: "pointer",
              height: 22,
              padding: 0,
              transition: "border-color 120ms, box-shadow 120ms",
              width: 34,
            }}
          />
        </span>
      </div>
      {open && (
        <div
          style={{
            background: dark ? "#202523" : "#fff",
            border: `1px solid ${dark ? "rgba(255,255,255,0.14)" : "#e5e7eb"}`,
            borderRadius: 8,
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 4,
            padding: 8,
            position: "absolute",
            right: 0,
            top: "100%",
            width: 224,
            zIndex: 50,
          }}
        >
          <SlArea hsl={hsl} onChange={(s, l) => update({ s, l })} />
          <HueStrip hue={hsl.h} onChange={(h) => update({ h })} />
          <AlphaStrip hsl={hsl} onChange={(a) => update({ a })} />
          <div style={{ display: "grid", gap: 4, gridTemplateColumns: "repeat(4, 1fr)" }}>
            {field("h", 360)}
            {field("s", 100)}
            {field("l", 100)}
            {field("a", 100)}
          </div>
          {/* HEX spans 3 columns (= the H+S+L block), transparency the 4th (= A). */}
          <div style={{ display: "grid", gap: 4, gridTemplateColumns: "repeat(4, 1fr)" }}>
            <label style={{ ...cell, gridColumn: "span 3" }}>
              <input
                type="text"
                value={hexText}
                spellCheck={false}
                onChange={(e) => onHexInput(e.target.value)}
                style={inputStyle}
              />
              <span style={captionStyle}>hex</span>
            </label>
            <label style={cell}>
              <input
                type="number"
                min={0}
                max={100}
                value={hsl.a}
                onChange={(e) => update({ a: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))) })}
                style={inputStyle}
              />
              <span style={captionStyle}>%</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
