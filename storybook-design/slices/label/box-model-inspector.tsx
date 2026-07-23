import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Copy, Info } from 'react-feather';

import { ColorPicker } from '../../color-picker';
import { KeyLabel } from './key-label';
import {
    gridToPx,
    gridToRem,
    KEY_LABEL_VGRID,
    type LabelSizeName,
    type Offset,
    REFERENCE_SIZES,
    ROW_SIZES,
    type RowGrid,
    type RowSize,
    sizesFitting,
    type VGrid,
    vgridToPrompt,
    vgridToTs,
} from './key-label-vgrid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How a single box-model layer is revealed. */
type Mode = 'hover' | 'always' | 'off';

/** The four things the inspector can visualise. `border` is drawn as a stroke;
 *  the other three are drawn as translucent fills. */
type LayerKey = 'margin' | 'border' | 'padding' | 'lineHeight';

/** Per-layer control state: a palette colour (`#rrggbbaa`) + a visibility mode. */
interface LayerConf {
    color: string;
    mode: Mode;
}

/** The baseline layer: one horizontal rule per row at the row's tuned baseline
 *  b(R) (stored in the grid). Visibility is a plain on/off switch in the header;
 *  it also carries a colour and a line thickness. Independent of the master
 *  Inspector switch. */
interface BaselineConf {
    color: string;
    thickness: number;
    visible: boolean;
}

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Boxes {
    margin: Rect;
    border: Rect;
    padding: Rect;
    content: Rect;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
//
// NOTE: this file lives outside Tailwind's `content` glob (`./app/**`), so any
// utility class not also used under `app/` generates no CSS. All colours,
// backgrounds, borders, accents and transforms are therefore set via inline
// `style`; only ubiquitous layout utilities are left as classes.

/** Fixed width of the border highlight (px). The inspector never resizes the
 *  labels — the border is a 1px stroke drawn on top, shown only when its layer
 *  is visible. */
const BORDER_PX = 1;

// Card order fills the 2×2 grid row-by-row:  line-height · padding / border · margin.
const LAYER_ORDER: LayerKey[] = ['lineHeight', 'padding', 'border', 'margin'];

const LABELS: Record<LayerKey, string> = {
    border: 'Border',
    lineHeight: 'Vertical size',
    margin: 'Margin',
    padding: 'Padding',
};

// Devtools-ish colours. `padding` defaults to always-on so the tuned pt/pb are
// visible while editing; the rest reveal on hover so the scale stays clean.
const DEFAULT_CONF: Record<LayerKey, LayerConf> = {
    border: { color: '#5b9bffff', mode: 'hover' },
    lineHeight: { color: '#b388ff66', mode: 'hover' },
    margin: { color: '#f6b26bcc', mode: 'hover' },
    padding: { color: '#7bd38a80', mode: 'always' },
};

// Baseline rule defaults: a 1px solid red line, shown.
const DEFAULT_BASELINE: BaselineConf = { color: '#ff3b30ff', thickness: 1, visible: true };

const MODE_OPTIONS: [Mode, string][] = [
    ['hover', 'On hover'],
    ['always', 'Always'],
    ['off', 'Off'],
];

// Magnification factors for the row matrix (1× = true size).
const ZOOM_LEVELS = [1, 2, 4, 6, 8];

// Dark-surface palette (inline).
const C = {
    accent: '#10b981',
    line: 'rgba(255,255,255,0.14)',
    panelBg: '#181c1a',
    textFaint: 'rgba(255,255,255,0.4)',
    textGhost: 'rgba(255,255,255,0.28)',
    textSoft: 'rgba(255,255,255,0.5)',
    textStrong: '#fff',
};

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

const SS_PREFIX = 'keylabel-inspector-v2:';

/** `useState` whose value is mirrored to `sessionStorage`, so it survives a page
 *  reload within the tab. Reads the stored value once on mount; writes on every
 *  change. Falls back to `initial` if storage is unavailable or the value is
 *  corrupt. */
function useSessionState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const storageKey = SS_PREFIX + key;
    const [value, setValue] = React.useState<T>(() => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (raw != undefined) return JSON.parse(raw);
        } catch {
            /* fall through to initial */
        }
        return initial;
    });
    React.useEffect(() => {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
            /* storage unavailable (private mode / quota) — persistence is best-effort */
        }
    }, [storageKey, value]);
    return [value, setValue];
}

/** Dismiss an open popover on an outside pointerdown or Escape. `ref` marks the
 *  "self" region (trigger + popover) that clicks inside must NOT dismiss. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
    React.useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, close, ref]);
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Split the area between an `outer` and `inner` rect into 4 edge rectangles
 *  (top, bottom, left, right) so a translucent ring paints only the layer's
 *  own band — not the boxes nested inside it. */
function ring(outer: Rect, inner: Rect): Rect[] {
    return [
        { h: inner.y - outer.y, w: outer.w, x: outer.x, y: outer.y },
        { h: outer.y + outer.h - (inner.y + inner.h), w: outer.w, x: outer.x, y: inner.y + inner.h },
        { h: inner.h, w: inner.x - outer.x, x: outer.x, y: inner.y },
        { h: inner.h, w: outer.x + outer.w - (inner.x + inner.w), x: inner.x + inner.w, y: inner.y },
    ];
}

/** Exactly two faint rules — the top and bottom of a single row band `R` tall —
 *  framing the row's cubes. No repeating grid. */
function ruledStyle(row: number): React.CSSProperties {
    const a = 'rgba(255,255,255,0.10)';
    const top = 8;
    const bottom = top + row;
    return {
        backgroundImage: `linear-gradient(to bottom, transparent ${top}px, ${a} ${top}px, ${a} ${top + 1}px, transparent ${top + 1}px, transparent ${bottom}px, ${a} ${bottom}px, ${a} ${bottom + 1}px, transparent ${bottom + 1}px)`,
        backgroundRepeat: 'no-repeat',
        padding: `${top}px 0 16px`,
    };
}

// ---------------------------------------------------------------------------
// Small dark-themed UI atoms
// ---------------------------------------------------------------------------

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            style={{
                background: checked ? C.accent : 'rgba(255,255,255,0.18)',
                border: 'none',
                borderRadius: 9999,
                cursor: 'pointer',
                flexShrink: 0,
                height: 20,
                padding: 0,
                position: 'relative',
                transition: 'background 150ms',
                width: 36,
            }}
        >
            <span
                style={{
                    background: '#fff',
                    borderRadius: 9999,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    height: 16,
                    left: checked ? 18 : 2,
                    position: 'absolute',
                    top: 2,
                    transition: 'left 150ms',
                    width: 16,
                }}
            />
        </button>
    );
}

function ModeToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
    return (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, display: 'flex', gap: 2, padding: 2 }}>
            {MODE_OPTIONS.map(([m, label]) => {
                const active = value === m;
                return (
                    <button
                        key={m}
                        type="button"
                        onClick={() => onChange(m)}
                        className="flex-1"
                        style={{
                            background: active ? '#fff' : 'transparent',
                            border: 'none',
                            borderRadius: 4,
                            color: active ? '#171717' : C.textSoft,
                            cursor: 'pointer',
                            fontSize: 10,
                            fontWeight: 500,
                            lineHeight: 1,
                            padding: '4px 6px',
                            transition: 'background 150ms, color 150ms',
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/** Segmented control that magnifies the row matrix so sub-pixel baseline tuning
 *  is legible. The rows and the space they occupy grow with the factor. */
function ZoomControl({ value, onChange }: { value: number; onChange: (z: number) => void }) {
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <span style={{ color: C.textSoft, fontSize: 12, fontWeight: 600 }}>Zoom</span>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, display: 'flex', gap: 2, padding: 2 }}>
                {ZOOM_LEVELS.map(z => {
                    const active = value === z;
                    return (
                        <button
                            key={z}
                            type="button"
                            onClick={() => onChange(z)}
                            style={{
                                background: active ? '#fff' : 'transparent',
                                border: 'none',
                                borderRadius: 4,
                                color: active ? '#171717' : C.textSoft,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 600,
                                lineHeight: 1,
                                padding: '5px 9px',
                                transition: 'background 150ms, color 150ms',
                            }}
                        >
                            {z}×
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** A numeric field you can actually clear: an empty value is kept while editing (never forced to 0)
 *  and reverts to the committed value on blur. Commits only a valid number. */
function NumField({
    value,
    onChange,
    min = 0,
    step,
    width = 56,
    textAlign,
}: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    step?: number;
    width?: number;
    textAlign?: 'center';
}) {
    const [text, setText] = React.useState(String(value));
    const [focused, setFocused] = React.useState(false);
    React.useEffect(() => {
        if (!focused) setText(String(value));
    }, [value, focused]);
    return (
        <input
            type="number"
            min={min}
            step={step}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={e => {
                setText(e.target.value);
                const t = e.target.value.trim();
                if (t === '') return; // keep it empty while editing
                const n = Number(t);
                if (!Number.isNaN(n)) onChange(step ? Math.max(min, n) : Math.max(min, Math.round(n)));
            }}
            style={{
                background: C.panelBg,
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                color: C.textStrong,
                fontSize: 12,
                padding: '4px 6px',
                textAlign,
                width,
            }}
        />
    );
}

/** A number field with −/+ steppers, for tuning a padding by eye at 1px steps. */
function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    const btn: React.CSSProperties = {
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${C.line}`,
        borderRadius: 4,
        color: C.textStrong,
        cursor: 'pointer',
        fontSize: 14,
        height: 22,
        lineHeight: 1,
        width: 22,
    };
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
            <span style={{ color: C.textSoft, fontSize: 11, width: 16 }}>{label}</span>
            <button type="button" style={btn} onClick={() => onChange(Math.max(0, value - 1))}>
                −
            </button>
            <NumField value={value} onChange={onChange} width={52} textAlign="center" />
            <button type="button" style={btn} onClick={() => onChange(value + 1)}>
                +
            </button>
            <span style={{ color: C.textSoft, fontSize: 11 }}>px</span>
        </div>
    );
}

/** A copy-to-clipboard button that flips to a checkmark for ~1.2s. */
function CopyButton({ text, label }: { text: string; label: string }) {
    const [done, setDone] = React.useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard?.writeText(text).then(
                    () => {
                        setDone(true);
                        setTimeout(() => setDone(false), 1200);
                    },
                    () => {},
                );
            }}
            className="flex items-center gap-1.5"
            style={{
                background: done ? C.accent : 'rgba(255,255,255,0.06)',
                border: `1px solid ${done ? C.accent : C.line}`,
                borderRadius: 6,
                color: C.textStrong,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 10px',
                transition: 'background 150ms, border-color 150ms',
            }}
        >
            {done ? <Check size={13} /> : <Copy size={13} />}
            {done ? 'Copied' : label}
        </button>
    );
}

// Shared popover surface.
const POPOVER: React.CSSProperties = {
    background: '#202523',
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
    color: C.textStrong,
    position: 'absolute',
    zIndex: 60,
};

// ---------------------------------------------------------------------------
// Per-cell padding editor (opened by clicking a cube)
// ---------------------------------------------------------------------------

function CellPopover({
    row,
    size,
    lineHeight,
    offset,
    onChange,
}: {
    row: number;
    size: LabelSizeName;
    lineHeight: number;
    offset: Offset;
    onChange: (off: Offset) => void;
}) {
    const sum = offset.pt + lineHeight + offset.pb;
    const hit = sum === row;
    // Positionless surface — the portal wrapper in InspectableLabel places it. Stop pointer/click
    // events so the outside-click dismiss (which lives on the cube's root) treats it as "inside".
    return (
        <div
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            style={{
                background: '#202523',
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                color: C.textStrong,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                width: 224,
            }}
        >
            <span style={{ fontSize: 12, fontWeight: 600 }}>
                <code style={{ color: C.accent }}>{size}</code> in {row}px row
            </span>
            <Stepper label="pt" value={offset.pt} onChange={pt => onChange({ ...offset, pt })} />
            <Stepper label="pb" value={offset.pb} onChange={pb => onChange({ ...offset, pb })} />
            <div style={{ borderTop: `1px solid ${C.line}`, color: hit ? C.accent : '#f6b26b', fontFamily: 'monospace', fontSize: 11, paddingTop: 8 }}>
                {offset.pt} + {lineHeight} + {offset.pb} = {sum}px {hit ? '✓' : `≠ ${row}px`}
            </div>
        </div>
    );
}

/** The cube's viewport rect, enough to place a popover below (`bottom`), above
 *  (`top`) or left-clamped (`left`). */
interface AnchorRect {
    top: number;
    bottom: number;
    left: number;
}

/** Portals its children to `document.body` (escaping the scrolling row band) and
 *  positions them `fixed` under the anchor — flipping above and clamping to the
 *  viewport when there isn't room below, so the bottom row's popover stays fully
 *  visible. Measures its own size in a layout effect (runs before paint → no
 *  flicker). */
function FloatingPopover({ anchor, children }: { anchor: AnchorRect; children: React.ReactNode }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState<{ left: number; top: number }>({ left: anchor.left, top: anchor.bottom + 6 });
    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const gap = 6;
        const margin = 8;
        const { offsetHeight: h, offsetWidth: w } = el;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Prefer below; flip above if it would overflow the bottom and there's room above.
        let top = anchor.bottom + gap;
        if (top + h > vh - margin) {
            const above = anchor.top - gap - h;
            top = above >= margin ? above : Math.max(margin, vh - margin - h);
        }
        const left = Math.max(margin, Math.min(anchor.left, vw - margin - w));
        setPos({ left, top });
    }, [anchor]);
    return createPortal(
        <div ref={ref} style={{ left: pos.left, position: 'fixed', top: pos.top, zIndex: 1000 }}>
            {children}
        </div>,
        document.body,
    );
}

// ---------------------------------------------------------------------------
// Per-row "how to build this" popover (opened by the row's info button)
// ---------------------------------------------------------------------------

/** The minimal JSX that reproduces this row in the project. */
function rowSnippet(row: number): string {
    const lines = sizesFitting(row)
        .map(s => `  <KeyLabel size="${s.name}">${s.name}</KeyLabel>`)
        .join('\n');
    return `<div className="flex flex-wrap items-start" data-vgrid-row="${row}">\n${lines}\n</div>`;
}

function RowInfoButton({ row }: { row: number }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLSpanElement>(null);
    useDismiss(open, () => setOpen(false), ref);
    const snippet = rowSnippet(row);
    return (
        <span ref={ref} style={{ display: 'inline-flex', position: 'relative' }}>
            <button
                type="button"
                aria-label={`How to build a ${row}px row`}
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-center"
                style={{
                    background: open ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: `1px solid ${open ? C.line : 'transparent'}`,
                    borderRadius: 5,
                    color: C.textSoft,
                    cursor: 'pointer',
                    height: 20,
                    padding: 0,
                    width: 20,
                }}
            >
                <Info size={13} />
            </button>
            {open && (
                <div style={{ ...POPOVER, display: 'flex', flexDirection: 'column', gap: 10, left: 0, marginTop: 6, padding: 12, top: '100%', width: 360 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Build a {row}px row</span>
                    <ul style={{ color: C.textSoft, display: 'flex', flexDirection: 'column', fontSize: 11, gap: 5, lineHeight: 1.45, margin: 0, paddingLeft: 16 }}>
                        <li>
                            The row declares its rhythm once via{' '}
                            <code style={{ color: C.textStrong }}>data-vgrid-row=&quot;{row}&quot;</code>; every cube inside inherits it, so all cubes are guaranteed {row}px tall.
                        </li>
                        <li>
                            Each cube carries only its own size — <code style={{ color: C.textStrong }}>KeyLabel</code>&apos;s{' '}
                            <code style={{ color: C.textStrong }}>size</code> prop sets its type and stamps <code style={{ color: C.textStrong }}>data-vgrid-size</code>.
                        </li>
                        <li>
                            The vertical padding (pt/pb) comes from the generated vgrid CSS — it makes each cube exactly {row}px tall and bakes its baseline into <code style={{ color: C.textStrong }}>padding-top</code>. Cubes align to the top; no JS runs at layout time.
                        </li>
                        <li>Load the vgrid CSS once (this story injects it from the same values you tune here).</li>
                    </ul>
                    <pre
                        style={{
                            background: C.panelBg,
                            border: `1px solid ${C.line}`,
                            borderRadius: 6,
                            color: C.textStrong,
                            fontFamily: 'monospace',
                            fontSize: 11,
                            lineHeight: 1.5,
                            margin: 0,
                            overflowX: 'auto',
                            padding: 10,
                            whiteSpace: 'pre',
                        }}
                    >
                        {snippet}
                    </pre>
                    <div className="flex justify-end">
                        <CopyButton text={snippet} label="Copy JSX" />
                    </div>
                </div>
            )}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Export toolbar (Copy TS + info, Copy prompt)
// ---------------------------------------------------------------------------

function ExportToolbar({ grid, zoom, onZoomChange }: { grid: VGrid; zoom: number; onZoomChange: (z: number) => void }) {
    const [infoOpen, setInfoOpen] = React.useState(false);
    const infoRef = React.useRef<HTMLSpanElement>(null);
    useDismiss(infoOpen, () => setInfoOpen(false), infoRef);
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
            <span style={{ marginRight: 'auto' }}>
                <ZoomControl value={zoom} onChange={onZoomChange} />
            </span>

            <span ref={infoRef} style={{ display: 'inline-flex', position: 'relative' }}>
                <span className="flex items-center gap-1">
                    <CopyButton text={vgridToTs(gridToRem(grid))} label="Copy TS" />
                    <button
                        type="button"
                        aria-label="Where to paste"
                        onClick={() => setInfoOpen(v => !v)}
                        className="flex items-center justify-center"
                        style={{
                            background: infoOpen ? 'rgba(255,255,255,0.12)' : 'transparent',
                            border: `1px solid ${infoOpen ? C.line : 'transparent'}`,
                            borderRadius: 5,
                            color: C.textSoft,
                            cursor: 'pointer',
                            height: 24,
                            padding: 0,
                            width: 24,
                        }}
                    >
                        <Info size={14} />
                    </button>
                </span>
                {infoOpen && (
                    <div style={{ ...POPOVER, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, padding: 12, right: 0, top: '100%', width: 320 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Where to paste</span>
                        <p style={{ color: C.textSoft, fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                            The copied text is the <code style={{ color: C.textStrong }}>KEY_LABEL_VGRID</code> literal. Open{' '}
                            <code style={{ color: C.textStrong }}>storybook-design/slices/label/key-label-vgrid.ts</code> and replace the existing{' '}
                            <code style={{ color: C.textStrong }}>KEY_LABEL_VGRID</code> declaration with it. The editor preview and the runtime CSS both regenerate from that value, so nothing else needs touching.
                        </p>
                        <p style={{ color: C.textGhost, fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                            Prefer to delegate? Use “Copy prompt” — the same values wrapped in an instruction to bake them in for you.
                        </p>
                    </div>
                )}
            </span>

            <CopyButton text={vgridToPrompt(gridToRem(grid))} label="Copy prompt" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inspectable cube — one KeyLabel with box-model highlights + click-to-edit
// ---------------------------------------------------------------------------

interface InspectableLabelProps {
    text: React.ReactNode;
    size: LabelSizeName;
    fontSize: number;
    lineHeight: number;
    row: RowSize;
    offset: Offset;
    onOffsetChange: (off: Offset) => void;
    conf: Record<LayerKey, LayerConf>;
    enabled: boolean;
    selected: boolean;
    onToggle: () => void;
    onClose: () => void;
    /** Magnification factor. The label is rendered at `× zoom` real pixels so
     *  sub-pixel baseline tuning is visible; the values in the popover stay the
     *  true (unscaled) px the grid stores. */
    zoom: number;
}

/** A `KeyLabel` padded by its grid cell (`pt`/`pb`), with the inspector's
 *  box-model layers overlaid WITHOUT changing geometry: the border is a fixed 1px
 *  stroke, the line-box is a translucent fill, and the padding ring now reflects
 *  the real tuned `pt`/`pb`. Clicking the cube opens its `CellPopover`. */
function InspectableLabel({
    text,
    size,
    fontSize,
    lineHeight,
    row,
    offset,
    onOffsetChange,
    conf,
    enabled,
    selected,
    onToggle,
    onClose,
    zoom,
}: InspectableLabelProps) {
    const [hovered, setHovered] = React.useState(false);
    const [boxes, setBoxes] = React.useState<Boxes | undefined>(undefined);
    const rootRef = React.useRef<HTMLDivElement>(null);
    // Measured element = the KeyLabel itself. Its content box is the line box (L); its padding is the
    // tuned pt/pb; so the padding ring shows the grid cell and the vertical-size fill shows L.
    const elRef = React.useRef<HTMLSpanElement>(null);

    // Close this cube's popover on an outside click / Escape (clicks inside the cube keep it open;
    // the plain onClick below toggles it).
    useDismiss(selected, onClose, rootRef);

    // Viewport anchor rect for the portaled popover, kept in sync with the cube's position while open
    // (the row band scrolls, so recompute on scroll/resize). FloatingPopover flips/clamps against it.
    const [anchor, setAnchor] = React.useState<AnchorRect | undefined>(undefined);
    React.useLayoutEffect(() => {
        if (!selected) {
            setAnchor(undefined);
            return;
        }
        const update = () => {
            const r = rootRef.current?.getBoundingClientRect();
            if (r) setAnchor({ bottom: r.bottom, left: r.left, top: r.top });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [selected]);

    // Measure the label's box model relative to the positioned root.
    const measure = React.useCallback(() => {
        const el = elRef.current;
        const root = rootRef.current;
        if (!el || !root) return;
        const cs = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        const r = root.getBoundingClientRect();
        const n = (v: string) => parseFloat(v) || 0;
        const m = { b: n(cs.marginBottom), l: n(cs.marginLeft), r: n(cs.marginRight), t: n(cs.marginTop) };
        const bw = { b: n(cs.borderBottomWidth), l: n(cs.borderLeftWidth), r: n(cs.borderRightWidth), t: n(cs.borderTopWidth) };
        const p = { b: n(cs.paddingBottom), l: n(cs.paddingLeft), r: n(cs.paddingRight), t: n(cs.paddingTop) };
        const bx = b.left - r.left;
        const by = b.top - r.top;
        const border: Rect = { h: b.height, w: b.width, x: bx, y: by };
        const marginBox: Rect = { h: b.height + m.t + m.b, w: b.width + m.l + m.r, x: bx - m.l, y: by - m.t };
        const paddingBox: Rect = { h: b.height - bw.t - bw.b, w: b.width - bw.l - bw.r, x: bx + bw.l, y: by + bw.t };
        const content: Rect = {
            h: Math.max(0, paddingBox.h - p.t - p.b),
            w: Math.max(0, paddingBox.w - p.l - p.r),
            x: paddingBox.x + p.l,
            y: paddingBox.y + p.t,
        };
        setBoxes({ border, content, margin: marginBox, padding: paddingBox });
    }, []);

    React.useLayoutEffect(() => {
        measure();
    }, [measure, text, fontSize, lineHeight, offset.pt, offset.pb, zoom]);

    React.useLayoutEffect(() => {
        const ro = new ResizeObserver(() => measure());
        if (elRef.current) ro.observe(elRef.current);
        if (rootRef.current) ro.observe(rootRef.current);
        return () => ro.disconnect();
    }, [measure]);

    const visible = (k: LayerKey) => enabled && conf[k].mode !== 'off' && (conf[k].mode === 'always' || hovered || selected);

    const fill = (rect: Rect, color: string, on: boolean): React.CSSProperties => ({
        background: color,
        height: rect.h,
        left: rect.x,
        opacity: on ? 1 : 0,
        pointerEvents: 'none',
        position: 'absolute',
        top: rect.y,
        transition: 'opacity 150ms ease',
        width: rect.w,
    });

    return (
        <div
            ref={rootRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onToggle}
            style={{ alignSelf: 'flex-start', cursor: 'pointer', position: 'relative' }}
        >
            {/* Block-level label padded by its grid cell: its content box is the line box (L) and its
                padding is pt/pb, so pt + L + pb is the cube's height — tuned toward R. Cubes are
                top-aligned (strategy B), the baseline being baked into pt. */}
            <KeyLabel
                ref={elRef}
                fontSize={fontSize * zoom}
                lineHeight={lineHeight * zoom}
                style={{
                    boxShadow: selected ? `0 0 0 1px ${C.accent}` : undefined,
                    color: '#fff',
                    display: 'block',
                    paddingBottom: offset.pb * zoom,
                    paddingTop: offset.pt * zoom,
                    whiteSpace: 'nowrap',
                }}
            >
                {text}
            </KeyLabel>

            {boxes && (
                <>
                    {/* Margin — translucent ring (only if the label actually has margin). */}
                    {ring(boxes.margin, boxes.border).map((rect, i) => (
                        <div key={`m${i}`} style={fill(rect, conf.margin.color, visible('margin'))} />
                    ))}
                    {/* Padding — translucent ring: the tuned pt/pb. */}
                    {ring(boxes.padding, boxes.content).map((rect, i) => (
                        <div key={`p${i}`} style={fill(rect, conf.padding.color, visible('padding'))} />
                    ))}
                    {/* Vertical size — fill of the content box: the element's own line-height. */}
                    <div style={fill(boxes.content, conf.lineHeight.color, visible('lineHeight'))} />
                    {/* Border — a fixed 1px stroke laid over the label's edge. */}
                    <div
                        style={{
                            border: `${BORDER_PX}px solid ${conf.border.color}`,
                            boxSizing: 'border-box',
                            height: boxes.border.h,
                            left: boxes.border.x,
                            opacity: visible('border') ? 1 : 0,
                            pointerEvents: 'none',
                            position: 'absolute',
                            top: boxes.border.y,
                            transition: 'opacity 150ms ease',
                            width: boxes.border.w,
                        }}
                    />
                </>
            )}

            {/* The editor popover is portaled to the body with fixed positioning: the zoomed row band
                scrolls (overflow), which would otherwise clip a popover nested inside it. FloatingPopover
                flips it above the cube and clamps it when there isn't room below (e.g. the bottom row). */}
            {selected && anchor && (
                <FloatingPopover anchor={anchor}>
                    <CellPopover row={row} size={size} lineHeight={lineHeight} offset={offset} onChange={onOffsetChange} />
                </FloatingPopover>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Settings spoiler
// ---------------------------------------------------------------------------

interface SettingsProps {
    enabled: boolean;
    setEnabled: (v: boolean) => void;
    conf: Record<LayerKey, LayerConf>;
    setColor: (k: LayerKey, color: string) => void;
    setMode: (k: LayerKey, mode: Mode) => void;
    baseline: BaselineConf;
    setBaseline: React.Dispatch<React.SetStateAction<BaselineConf>>;
}

/** A collapsible spoiler holding every inspector control. It expands inline
 *  (pushing the scale down) rather than floating, so it never overlaps what
 *  you're inspecting. */
function SettingsSpoiler({ enabled, setEnabled, conf, setColor, setMode, baseline, setBaseline }: SettingsProps) {
    const [open, setOpen] = useSessionState('open', false);

    return (
        <div style={{ background: C.panelBg, border: `1px solid ${C.line}`, borderRadius: 12, color: C.textStrong }}>
            {/* The whole header row toggles the spoiler; only the switches are exempt. */}
            {/* Header toggles the spoiler. Each switch's click target fills the FULL header height
                (its own vertical padding), so clicking anywhere in a switch's column toggles it; the
                empty middle + the chevron toggle the spoiler. */}
            <div
                onClick={() => setOpen(v => !v)}
                role="button"
                aria-expanded={open}
                className="flex w-full items-stretch justify-between"
                style={{ cursor: 'pointer' }}
            >
                <span className="flex items-stretch gap-4">
                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setEnabled(!enabled);
                        }}
                        className="flex items-center gap-2"
                        style={{ cursor: 'pointer', padding: '10px 0 10px 14px' }}
                    >
                        <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                            <Switch checked={enabled} onChange={setEnabled} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Inspector</span>
                    </span>
                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setBaseline(b => ({ ...b, visible: !b.visible }));
                        }}
                        className="flex items-center gap-2"
                        style={{ cursor: 'pointer', padding: '10px 0' }}
                    >
                        <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                            <Switch checked={baseline.visible} onChange={v => setBaseline(b => ({ ...b, visible: v }))} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Baseline</span>
                    </span>
                </span>
                <span className="flex items-center" style={{ padding: '10px 14px' }}>
                    <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                </span>
            </div>

            {open && (
                <div style={{ borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 16, padding: 14 }}>
                    {/* Box-model layers — gated by the master switch. */}
                    <div
                        style={{
                            display: 'grid',
                            gap: 16,
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            opacity: enabled ? 1 : 0.4,
                            pointerEvents: enabled ? undefined : 'none',
                        }}
                    >
                        {LAYER_ORDER.map(k => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                                <span className="uppercase tracking-wide" style={{ color: C.textSoft, fontSize: 11, fontWeight: 600 }}>
                                    {LABELS[k]}
                                    <span style={{ color: C.textGhost, marginLeft: 6, textTransform: 'none' }}>{k === 'border' ? 'stroke' : 'fill'}</span>
                                </span>
                                <ColorPicker tone="dark" label="Color" value={conf[k].color} onChange={c => setColor(k, c)} />
                                <ModeToggle value={conf[k].mode} onChange={m => setMode(k, m)} />
                            </div>
                        ))}
                    </div>

                    {/* Baseline — the shared per-row rule b(R). Colour + thickness here; per-row position
                        is tuned inline at the end of each row. */}
                    <div style={{ borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 16 }}>
                        <span className="uppercase tracking-wide" style={{ color: C.textSoft, fontSize: 11, fontWeight: 600 }}>
                            Baseline
                            <span style={{ color: C.textGhost, marginLeft: 6, textTransform: 'none' }}>rule</span>
                        </span>
                        <div style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <ColorPicker tone="dark" label="Color" value={baseline.color} onChange={c => setBaseline(b => ({ ...b, color: c }))} />
                            </div>
                            <label style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                                <span style={{ color: C.textSoft, fontSize: 11 }}>Thickness</span>
                                <NumField value={baseline.thickness} onChange={n => setBaseline(b => ({ ...b, thickness: n }))} min={0.1} step={0.1} />
                                <span style={{ color: C.textSoft, fontSize: 11 }}>px</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Conventions info block
// ---------------------------------------------------------------------------

/** A collapsible panel documenting the vertical-rhythm grid conventions, so the
 *  rules that govern the editor and the shipped CSS are readable on the page. */
function ConventionsPanel() {
    const [open, setOpen] = useSessionState('conventions-open', true);
    const code: React.CSSProperties = { color: C.textStrong, fontFamily: 'monospace' };
    const term = (t: string) => <code style={code}>{t}</code>;
    const item: React.CSSProperties = { lineHeight: 1.5 };
    return (
        <div style={{ background: C.panelBg, border: `1px solid ${C.line}`, borderRadius: 12, color: C.textStrong }}>
            <div
                onClick={() => setOpen(v => !v)}
                role="button"
                aria-expanded={open}
                className="flex w-full items-center justify-between"
                style={{ cursor: 'pointer', padding: '10px 14px' }}
            >
                <span className="flex items-center gap-2">
                    <Info size={15} style={{ color: C.textSoft }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Vertical-rhythm grid — conventions</span>
                </span>
                <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </div>

            {open && (
                <ul
                    style={{
                        borderTop: `1px solid ${C.line}`,
                        color: C.textSoft,
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: 12,
                        gap: 8,
                        margin: 0,
                        padding: '14px 14px 14px 32px',
                    }}
                >
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Goal.</b> A reusable baseline grid so primitives snap together like Lego
                        in one wrapping row — every element in a row sits on the same baseline and is the same height.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Rhythm lives in the cube, not the container.</b> A row has a vertical size{' '}
                        {term('R')}; each cube pads its own box to exactly {term('R')} tall: {term('pt + L + pb = R')} ({term('L')} = the
                        element&apos;s own line-box height). The container stays free — height hugs content, width stretches or hugs.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Strategy B.</b> The baseline is baked into {term('pt')} and rows align to the{' '}
                        <b>top</b> ({term('flex-start')}) — so a foreign/un-slotted element can&apos;t drag the cubes&apos; alignment.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Shared contract.</b> All primitives agree on the row sizes {term('R')} and the
                        per-row baseline {term('b(R)')}. A size fits a row iff {term('L ≤ R')}. Tune {term('pt/pb')} so the box = {term('R')}{' '}
                        and the baseline lands on {term('b(R)')}.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Applied with zero runtime JS.</b> The row declares {term('data-vgrid-row="R"')};
                        each cube carries {term('data-vgrid-size')} (KeyLabel&apos;s {term('size')} prop). Generated CSS supplies{' '}
                        {term('pt/pb')} by cascade.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Units.</b> Everything shipped in {term('rem')} (scales with the user&apos;s base
                        font-size; alignment doesn&apos;t drift). Tuned here in {term('px')} — exact, since {term('1px = 0.0625rem')}.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Scale.</b> {term('base')} = 22px, {term('lg')} = 26px (overrides Tailwind).
                        Rows {term('16–40')}; {term('xs…4xl')} are tunable, {term('5xl+')} are reference-only (greyed).
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Edit.</b> Click a cube → tune {term('pt/pb')}; set {term('b(R)')} per row; zoom to
                        check sub-pixel; <b>Copy TS</b> / <b>Copy prompt</b> bakes the tuned grid back into {term('key-label-vgrid.ts')}.
                    </li>
                </ul>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------

/**
 * The KeyLabel vertical-rhythm editor. A collapsible dark spoiler drives the
 * box-model visualisation and the shared baseline rule. Below, the type scale is
 * laid out per row size R: every fitting label is a clickable cube — click it to
 * tune its `pt`/`pb` (so `pt + L + pb = R` and its baseline lands on the row's
 * b(R)); edit the b(R) offset at the end of each row to move the baseline; and
 * the ℹ on each row header shows how to reproduce that row in code. The tuned
 * grid is exported back to `key-label-vgrid.ts` via the toolbar on top.
 */
export function BoxModelInspector() {
    const [enabled, setEnabled] = useSessionState('enabled', true);
    const [conf, setConf] = useSessionState<Record<LayerKey, LayerConf>>('conf', DEFAULT_CONF);
    const setColor = (k: LayerKey, color: string) => setConf(c => ({ ...c, [k]: { ...c[k], color } }));
    const setMode = (k: LayerKey, mode: Mode) => setConf(c => ({ ...c, [k]: { ...c[k], mode } }));

    const [baseline, setBaseline] = useSessionState<BaselineConf>('baselineConf2', DEFAULT_BASELINE);

    // The tuned grid — the working copy, in PX (the editor's native unit), seeded from the committed
    // rem source of truth and persisted per tab. Exported back to key-label-vgrid.ts (in rem) via the
    // toolbar; the exact px↔rem round-trip keeps this lossless.
    const [grid, setGrid] = useSessionState<VGrid>('vgrid-px', gridToPx(KEY_LABEL_VGRID));
    const rowEntry = (g: VGrid, row: RowSize): RowGrid => g[row] ?? { baseline: Math.round(row * 0.75), sizes: {} };
    const setOffset = (row: RowSize, size: LabelSizeName, off: Offset) =>
        setGrid(g => {
            const entry = rowEntry(g, row);
            return { ...g, [row]: { ...entry, sizes: { ...entry.sizes, [size]: off } } };
        });
    const setRowBaseline = (row: RowSize, px: number) =>
        setGrid(g => ({ ...g, [row]: { ...rowEntry(g, row), baseline: px } }));

    // The single open cell popover (ephemeral UI), keyed `row:size`.
    const [sel, setSel] = React.useState<string | undefined>(undefined);

    // Row-matrix magnification (persisted per tab).
    const [zoom, setZoom] = useSessionState('zoom', 1);

    return (
        <div className="flex flex-col gap-8">
            <ExportToolbar grid={grid} zoom={zoom} onZoomChange={setZoom} />
            <SettingsSpoiler
                enabled={enabled}
                setEnabled={setEnabled}
                conf={conf}
                setColor={setColor}
                setMode={setMode}
                baseline={baseline}
                setBaseline={setBaseline}
            />

            {/* A narrow reference column beside the per-row matrix. */}
            <div style={{ alignItems: 'flex-start', display: 'flex', gap: 24 }}>
                <div
                    style={{
                        background: C.panelBg,
                        border: `1px solid ${C.line}`,
                        borderRadius: 12,
                        color: C.textStrong,
                        flexShrink: 0,
                        order: 1, // place the column to the right of the matrix
                        overflow: 'hidden',
                        width: 120,
                    }}
                >
                    {REFERENCE_SIZES.map((s, i) => {
                        // A size participates in the grid only if it fits the tallest row; the rest are
                        // shown greyed-out as a reference (they can't be tuned).
                        const participates = s.lineHeight <= Math.max(...ROW_SIZES);
                        return (
                            <div
                                key={s.name}
                                style={{
                                    borderTop: i ? `1px solid rgba(255,255,255,0.06)` : undefined,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    padding: '8px 14px',
                                }}
                            >
                                {/* Label rendered in the very style it denotes (its font size & line height). */}
                                <span
                                    style={{
                                        color: participates ? C.textStrong : C.textGhost,
                                        fontSize: s.fontSize,
                                        lineHeight: `${s.lineHeight}px`,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {s.name}
                                </span>
                                <span style={{ color: participates ? C.textSoft : C.textGhost, fontFamily: 'monospace', fontSize: 12 }}>
                                    {s.fontSize}px {s.lineHeight}px
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* The per-row matrix — every fitting size, each a clickable cube. */}
                <div className="flex flex-col gap-8" style={{ flex: 1, minWidth: 0 }}>
                    {ROW_SIZES.map(row => {
                        const entry = grid[row];
                        const rowBaseline = entry?.baseline ?? Math.round(row * 0.75);
                        return (
                            <div key={row} className="flex flex-col gap-2">
                                <span
                                    className="flex items-center gap-2"
                                    style={{ color: C.textFaint, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                                >
                                    vertical size {row}px
                                    <RowInfoButton row={row} />
                                </span>
                                <div style={{ alignItems: 'flex-end', display: 'flex', gap: 12 }}>
                                    <div style={{ ...ruledStyle(row * zoom), flex: 1, minWidth: 0, overflowX: zoom > 1 ? 'auto' : undefined }}>
                                        {/* The row band: cubes pin to the top-left and keep their padded height;
                                            `relative` anchors the baseline rule to the band's top. Zoomed, the band
                                            hugs its content width (`max-content`) and never wraps, so cubes stay on
                                            one line and the band scrolls horizontally instead. */}
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                columnGap: 20 * zoom,
                                                display: 'flex',
                                                flexWrap: zoom > 1 ? 'nowrap' : 'wrap',
                                                justifyContent: 'flex-start',
                                                // Zoomed: at least as wide as the band (so the baseline rule spans the
                                                // full width), growing to `max-content` and scrolling when cubes overflow.
                                                minWidth: zoom > 1 ? '100%' : undefined,
                                                position: 'relative',
                                                rowGap: 0,
                                                width: zoom > 1 ? 'max-content' : undefined,
                                            }}
                                        >
                                            {sizesFitting(row).map(s => {
                                                const off = entry?.sizes[s.name] ?? { pb: 0, pt: 0 };
                                                const key = `${row}:${s.name}`;
                                                return (
                                                    <InspectableLabel
                                                        key={s.name}
                                                        text={s.name}
                                                        size={s.name}
                                                        fontSize={s.fontSize}
                                                        lineHeight={s.lineHeight}
                                                        row={row}
                                                        offset={off}
                                                        onOffsetChange={next => setOffset(row, s.name, next)}
                                                        conf={conf}
                                                        enabled={enabled}
                                                        selected={sel === key}
                                                        onToggle={() => setSel(prev => (prev === key ? undefined : key))}
                                                        onClose={() => setSel(prev => (prev === key ? undefined : prev))}
                                                        zoom={zoom}
                                                    />
                                                );
                                            })}
                                            {/* Baseline b(R) — a horizontal rule `rowBaseline` px below the band's top. */}
                                            {baseline.visible && (
                                                <div
                                                    style={{
                                                        borderTop: `${baseline.thickness}px solid ${baseline.color}`,
                                                        left: 0,
                                                        pointerEvents: 'none',
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: rowBaseline * zoom,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {/* End-of-row control: b(R), px from the band top. */}
                                    <label style={{ alignItems: 'center', display: 'flex', flexShrink: 0, fontSize: 11, gap: 6, paddingBottom: 16 }}>
                                        <span style={{ color: C.textSoft }}>b(R)</span>
                                        <NumField value={rowBaseline} onChange={n => setRowBaseline(row, n)} />
                                    </label>
                                </div>
                            </div>
                        );
                    })}

                    <ConventionsPanel />
                </div>
            </div>
        </div>
    );
}
