import { PublicKey } from '@solana/web3.js';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, ChevronDown, Copy, ExternalLink as ExternalLinkIcon, FileText, Info, MoreHorizontal, Trash2, Upload, Zap } from 'react-feather';

import { Address } from '@/app/components/common/Address';
import { RawDataField } from '@/app/components/shared/RawDataField';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Skeleton } from '@/app/components/shared/ui/skeleton';

import { ColorPicker } from '../../color-picker';
import { type InlineIconGrid, inlineIconToPrompt, inlineIconToTs, seedInlineIconGrid } from '../label/inline-icon-vgrid';
import { KeyLabel } from '../label/key-label';
import { labelSize, ROW_SIZES, type RowSize } from '../label/key-label-vgrid';
import {
    type ElementConfig,
    type ElementInstance,
    gridsToPrompt,
    gridsToTs,
    gridTypeOf,
    ICON_OPTIONS,
    LABEL_SIZE_NAMES,
    makeId,
    type Offset,
    parseScene,
    PRIMITIVE_META,
    PRIMITIVE_TYPES,
    type PrimitiveGrids,
    type PrimitiveType,
    rowContentsToPrompt,
    rowContentsToTs,
    sceneToRowContents,
    seedBaselines,
    seedGrids,
    seedRowContents,
    sizeKeyOf,
} from '../label/primitives-vgrid';
import { InlineIconInspector } from './inline-icon-inspector';
import {
    type AnchorRect,
    type BaselineConf,
    C,
    CopyButton,
    createSessionState,
    DEFAULT_BASELINE,
    FloatingPopover,
    NumField,
    Select,
    Switch,
    useDismiss,
} from './ui-atoms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How a single box-model layer is revealed. */
type Mode = 'hover' | 'always' | 'off';

/** The four things the inspector can visualise. `border` is drawn as a stroke;
 *  the other three are drawn as translucent fills. */
type LayerKey = 'margin' | 'border' | 'padding' | 'lineHeight';

interface LayerConf {
    color: string;
    mode: Mode;
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
    /** The primitive's own (border-box) height in TRUE px — used for the fit check. */
    trueH: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
//
// NOTE: this file lives outside Tailwind's `content` glob (`./app/**`), so any
// utility class not also used under `app/` generates no CSS. All colours,
// backgrounds, borders, accents and transforms are therefore set via inline
// `style`; only ubiquitous layout utilities are left as classes.

const BORDER_PX = 1;

const LAYER_ORDER: LayerKey[] = ['lineHeight', 'padding', 'border', 'margin'];

const LABELS: Record<LayerKey, string> = {
    border: 'Border',
    lineHeight: 'Vertical size',
    margin: 'Margin',
    padding: 'Padding',
};

const DEFAULT_CONF: Record<LayerKey, LayerConf> = {
    border: { color: '#5b9bffff', mode: 'hover' },
    lineHeight: { color: '#b388ff66', mode: 'hover' },
    margin: { color: '#f6b26bcc', mode: 'hover' },
    padding: { color: '#7bd38a80', mode: 'always' },
};

const MODE_OPTIONS: [Mode, string][] = [
    ['hover', 'On hover'],
    ['always', 'Always'],
    ['off', 'Off'],
];

const ZOOM_LEVELS = [1, 2, 4, 6, 8];

// Default horizontal spacing between elements in a row (px); editable per row.
const DEFAULT_GAP = 20;

// A real base58 account + a few real-looking bytes so Address / RawDataField have
// something to render. Kept inline so this slice stays free of cross-slice imports.
const MOCK_PUBKEY = new PublicKey('So11111111111111111111111111111111111111112');
const MOCK_BYTES = new Uint8Array([2, 0, 0, 0, 128, 150, 152, 0, 0, 0, 0, 0, 9, 1, 4, 7]);

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
    AlertTriangle,
    Check,
    ChevronDown,
    Copy,
    ExternalLink: ExternalLinkIcon,
    Info,
    Zap,
};

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

const SS_PREFIX = 'primitives-inspector-v1:';
const useSessionState = createSessionState(SS_PREFIX);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Split the area between an `outer` and `inner` rect into 4 edge rectangles so a
 *  translucent ring paints only the layer's own band. */
function ring(outer: Rect, inner: Rect): Rect[] {
    return [
        { h: inner.y - outer.y, w: outer.w, x: outer.x, y: outer.y },
        { h: outer.y + outer.h - (inner.y + inner.h), w: outer.w, x: outer.x, y: inner.y + inner.h },
        { h: inner.h, w: inner.x - outer.x, x: outer.x, y: inner.y },
        { h: inner.h, w: outer.x + outer.w - (inner.x + inner.w), x: inner.x + inner.w, y: inner.y },
    ];
}

/** Faint gray guides drawn as background gradient layers over the padded row band:
 *   • `showRulers` — the two rules delimiting the R band (top of band, its bottom `row` px later).
 *   • `showPads` — a line at the very top and very bottom of the PADDED band, so the `py` padding
 *     above/below the R band is visible (only when `py > 0`).
 *  The symmetric vertical padding `py` is applied either way. */
function ruledStyle(row: number, py: number, showRulers: boolean, showPads: boolean): React.CSSProperties {
    const a = 'rgba(255,255,255,0.10)';
    const layers: string[] = [];
    if (showRulers) {
        const top = py;
        const bottom = top + row;
        layers.push(
            `linear-gradient(to bottom, transparent ${top}px, ${a} ${top}px, ${a} ${top + 1}px, transparent ${top + 1}px, transparent ${bottom}px, ${a} ${bottom}px, ${a} ${bottom + 1}px, transparent ${bottom + 1}px)`,
        );
    }
    if (showPads && py > 0) {
        // Top edge of the padded band (anchored to the box top) and bottom edge (anchored to bottom).
        layers.push(`linear-gradient(to bottom, ${a} 0, ${a} 1px, transparent 1px)`);
        layers.push(`linear-gradient(to top, ${a} 0, ${a} 1px, transparent 1px)`);
    }
    return {
        backgroundImage: layers.length ? layers.join(', ') : undefined,
        backgroundRepeat: 'no-repeat',
        padding: `${py}px 0`,
    };
}

// ---------------------------------------------------------------------------
// Small dark-themed UI atoms
// ---------------------------------------------------------------------------

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

/** Per-row inter-element spacing field. Its border shows only on hover/focus
 *  (NumField's border shows only on hover/focus via `ghost`). */
function GapInput({ label = 'gap', value, onChange }: { label?: string; value: number; onChange: (v: number) => void }) {
    return (
        <label style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
            <span style={{ color: C.textSoft }}>{label}</span>
            <NumField value={value} onChange={onChange} ghost width={52} />
        </label>
    );
}

// ---------------------------------------------------------------------------
// Primitive rendering
// ---------------------------------------------------------------------------

// Typed literal option lists — `.find()` on a readonly-literal array narrows a
// stringly-typed config value to the component's own prop union WITHOUT a type
// assertion (the repo forbids `as`).
const TAG_VARIANTS = ['default', 'secondary', 'success', 'info', 'warning', 'destructive', 'transparent'] as const;
const TAG_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
const BTN_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'accent', 'destructive', 'link'] as const;
const BTN_SIZES = ['compact', 'sm', 'default', 'lg'] as const;

const klSizeOf = (v?: string) => LABEL_SIZE_NAMES.find(s => s === v);

function iconEl(name?: string): React.ReactNode {
    if (!name) return undefined;
    const Cmp = ICONS[name];
    return Cmp ? <Cmp /> : undefined;
}

/** Render the real base primitive for an instance. The element is NOT padded here
 *  — the vgrid pt/pb live on the positioning wrapper (see InspectableCube). */
function renderPrimitive(type: PrimitiveType, config: ElementConfig): React.ReactNode {
    switch (type) {
        case 'keylabel':
            return <KeyLabel size={klSizeOf(config.size)}>{config.text || config.size}</KeyLabel>;
        case 'tag':
            return (
                <Badge ui="tw" variant={TAG_VARIANTS.find(v => v === config.variant)} size={TAG_SIZES.find(s => s === config.size)}>
                    {iconEl(config.icon)}
                    {config.text || config.variant}
                </Badge>
            );
        case 'button':
            return (
                <Button ui="tw" variant={BTN_VARIANTS.find(v => v === config.variant)} size={BTN_SIZES.find(s => s === config.size)}>
                    {iconEl(config.icon)}
                    {config.text || 'Button'}
                </Button>
            );
        case 'address':
            return <Address pubkey={MOCK_PUBKEY} link={config.link} overrideText={config.text || undefined} />;
        case 'skeleton': {
            const L = labelSize(klSizeOf(config.size) ?? 'base').lineHeight;
            return <Skeleton style={{ height: L, width: config.width ?? 96 }} />;
        }
        case 'rawdata':
            return (
                <div style={{ width: 260 }}>
                    <RawDataField data={MOCK_BYTES} filename="mock" />
                </div>
            );
    }
}

// ---------------------------------------------------------------------------
// Per-element settings (collapsed by default inside the cell popover)
// ---------------------------------------------------------------------------

function ElementSettings({ type, config, onChange }: { type: PrimitiveType; config: ElementConfig; onChange: (c: ElementConfig) => void }) {
    const [open, setOpen] = React.useState(false);
    const meta = PRIMITIVE_META[type];
    const hasAny = meta.sizeOptions.length > 0 || meta.variantOptions.length > 0 || meta.hasIcon || meta.hasText || meta.hasLink || meta.hasWidth;
    if (!hasAny) return undefined;
    const rowStyle: React.CSSProperties = { alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'space-between' };
    const lbl: React.CSSProperties = { color: C.textSoft, flexShrink: 0, fontSize: 11, width: 52 };
    return (
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center justify-between"
                style={{ background: 'transparent', border: 'none', color: C.textStrong, cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}
            >
                <span className="uppercase tracking-wide" style={{ color: C.textSoft }}>
                    Element settings
                </span>
                <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </button>
            {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                    {meta.hasText && (
                        <label style={rowStyle}>
                            <span style={lbl}>Text</span>
                            <input
                                value={config.text ?? ''}
                                onChange={e => onChange({ ...config, text: e.target.value })}
                                style={{ background: C.panelBg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textStrong, flex: 1, fontSize: 12, minWidth: 0, padding: '4px 6px' }}
                            />
                        </label>
                    )}
                    {meta.sizeOptions.length > 0 && (
                        <label style={rowStyle}>
                            <span style={lbl}>Size</span>
                            <span style={{ flex: 1 }}>
                                <Select value={config.size ?? meta.sizeOptions[0]} options={meta.sizeOptions} onChange={size => onChange({ ...config, size })} />
                            </span>
                        </label>
                    )}
                    {meta.variantOptions.length > 0 && (
                        <label style={rowStyle}>
                            <span style={lbl}>Color</span>
                            <span style={{ flex: 1 }}>
                                <Select value={config.variant ?? meta.variantOptions[0]} options={meta.variantOptions} onChange={variant => onChange({ ...config, variant })} />
                            </span>
                        </label>
                    )}
                    {meta.hasIcon && (
                        <label style={rowStyle}>
                            <span style={lbl}>Icon</span>
                            <span style={{ flex: 1 }}>
                                <Select
                                    value={config.icon ?? 'none'}
                                    options={['none', ...ICON_OPTIONS]}
                                    onChange={v => onChange({ ...config, icon: v === 'none' ? undefined : v })}
                                />
                            </span>
                        </label>
                    )}
                    {meta.hasWidth && (
                        <label style={rowStyle}>
                            <span style={lbl}>Width</span>
                            <input
                                type="number"
                                min={8}
                                value={config.width ?? 96}
                                onChange={e => onChange({ ...config, width: Math.max(8, Math.round(Number(e.target.value) || 0)) })}
                                style={{ background: C.panelBg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textStrong, flex: 1, fontSize: 12, minWidth: 0, padding: '4px 6px' }}
                            />
                        </label>
                    )}
                    {meta.hasLink && (
                        <label style={rowStyle}>
                            <span style={lbl}>Link</span>
                            <Switch checked={config.link ?? false} onChange={link => onChange({ ...config, link })} />
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}

function CellPopover({
    row,
    type,
    config,
    trueH,
    offset,
    onOffsetChange,
    onConfigChange,
    onDelete,
}: {
    row: number;
    type: PrimitiveType;
    config: ElementConfig;
    trueH: number;
    offset: Offset;
    onOffsetChange: (off: Offset) => void;
    onConfigChange: (c: ElementConfig) => void;
    onDelete: () => void;
}) {
    const h = Math.round(trueH);
    const sum = offset.pt + h + offset.pb;
    const hit = sum === row;
    const tooTall = h > row;
    const sizeKey = sizeKeyOf(type, config);
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
                width: 240,
            }}
        >
            <div style={{ alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                    <code style={{ color: C.accent }}>{PRIMITIVE_META[type].label}</code>
                    <code style={{ color: C.textSoft }}> · {sizeKey}</code> in {row}px row
                </span>
                <button
                    type="button"
                    aria-label="Remove element"
                    onClick={onDelete}
                    className="flex items-center justify-center"
                    style={{ background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 5, color: C.danger, cursor: 'pointer', flexShrink: 0, height: 24, padding: 0, width: 24 }}
                >
                    <Trash2 size={13} />
                </button>
            </div>
            <Stepper label="pt" value={offset.pt} onChange={pt => onOffsetChange({ ...offset, pt })} />
            <Stepper label="pb" value={offset.pb} onChange={pb => onOffsetChange({ ...offset, pb })} />
            <div style={{ borderTop: `1px solid ${C.line}`, color: hit ? C.accent : tooTall ? C.danger : '#f6b26b', fontFamily: 'monospace', fontSize: 11, paddingTop: 8 }}>
                {offset.pt} + {h} + {offset.pb} = {sum}px {hit ? '✓' : `≠ ${row}px`}
                {tooTall && ' · too tall for row'}
            </div>
            <ElementSettings type={type} config={config} onChange={onConfigChange} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inspectable cube — one placed primitive wrapped for the vgrid + overlays
// ---------------------------------------------------------------------------

interface InspectableCubeProps {
    instance: ElementInstance;
    row: number;
    offset: Offset;
    onOffsetChange: (off: Offset) => void;
    onConfigChange: (c: ElementConfig) => void;
    onDelete: () => void;
    conf: Record<LayerKey, LayerConf>;
    enabled: boolean;
    selected: boolean;
    onToggle: () => void;
    onClose: () => void;
    zoom: number;
    onDragStart: () => void;
    onDragEnd: () => void;
}

function InspectableCube({
    instance,
    row,
    offset,
    onOffsetChange,
    onConfigChange,
    onDelete,
    conf,
    enabled,
    selected,
    onToggle,
    onClose,
    zoom,
    onDragStart,
    onDragEnd,
}: InspectableCubeProps) {
    const [hovered, setHovered] = React.useState(false);
    const [boxes, setBoxes] = React.useState<Boxes | undefined>(undefined);
    const rootRef = React.useRef<HTMLDivElement>(null);
    // The positioning wrapper carries the vgrid pt/pb. `elRef` is the primitive's own box (its height
    // is `h` for the fit check); the padding ring between wrapper and primitive shows pt/pb.
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const elRef = React.useRef<HTMLSpanElement>(null);

    useDismiss(selected, onClose, rootRef);

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

    // Measure the wrapper (padding box) + primitive (content/border box) relative to the root. Under
    // CSS `zoom`, getBoundingClientRect returns SCALED coords, so divide diffs by zoom to get the
    // local px the overlay (a child of the same zoomed context) is positioned in.
    const measure = React.useCallback(() => {
        const wrap = wrapRef.current;
        const el = elRef.current;
        const root = rootRef.current;
        if (!wrap || !el || !root) return;
        const r = root.getBoundingClientRect();
        const wb = wrap.getBoundingClientRect();
        const eb = el.getBoundingClientRect();
        const s = zoom || 1;
        const toLocal = (b: DOMRect): Rect => ({ h: b.height / s, w: b.width / s, x: (b.left - r.left) / s, y: (b.top - r.top) / s });
        const padding = toLocal(wb);
        const content = toLocal(eb);
        setBoxes({ border: content, content, margin: padding, padding, trueH: eb.height / s });
    }, [zoom]);

    React.useLayoutEffect(() => {
        measure();
    }, [measure, instance.config, offset.pt, offset.pb]);

    React.useLayoutEffect(() => {
        const ro = new ResizeObserver(() => measure());
        if (elRef.current) ro.observe(elRef.current);
        if (wrapRef.current) ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, [measure]);

    const visible = (k: LayerKey) => enabled && conf[k].mode !== 'off' && (conf[k].mode === 'always' || hovered || selected);
    const tooTall = boxes ? Math.round(boxes.trueH) > row : false;

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
            data-cube
            draggable
            onDragStart={e => {
                e.dataTransfer.effectAllowed = 'move';
                // Some browsers require data to be set for a drag to start.
                e.dataTransfer.setData('text/plain', instance.id);
                onDragStart();
            }}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onToggle}
            // inline-flex: as a flex item of the row band, the cube is blockified (no inline
            // vertical-align games), and flex containers create NO line box — so the wrapper hugs the
            // primitive with no text strut. The primitive's top therefore lands at `origin + pt`,
            // exactly like the native KeyLabel grid (where pt is applied to a block element).
            style={{ alignSelf: 'flex-start', cursor: 'pointer', display: 'inline-flex', position: 'relative' }}
        >
            <div
                ref={wrapRef}
                style={{
                    boxShadow: selected ? `0 0 0 1px ${C.accent}` : tooTall ? `0 0 0 1px ${C.danger}` : undefined,
                    display: 'flex',
                    paddingBottom: offset.pb,
                    paddingTop: offset.pt,
                }}
            >
                <span ref={elRef} style={{ display: 'flex' }}>
                    {renderPrimitive(instance.type, instance.config)}
                </span>
            </div>

            {boxes && (
                <>
                    {ring(boxes.padding, boxes.content).map((rect, i) => (
                        <div key={`p${i}`} style={fill(rect, conf.padding.color, visible('padding'))} />
                    ))}
                    <div style={fill(boxes.content, conf.lineHeight.color, visible('lineHeight'))} />
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

            {selected && anchor && (
                <FloatingPopover anchor={anchor}>
                    <CellPopover
                        row={row}
                        type={instance.type}
                        config={instance.config}
                        trueH={boxes?.trueH ?? 0}
                        offset={offset}
                        onOffsetChange={onOffsetChange}
                        onConfigChange={onConfigChange}
                        onDelete={onDelete}
                    />
                </FloatingPopover>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Palette (right panel) — drag source for the six primitive types
// ---------------------------------------------------------------------------

function Palette({ onDragType }: { onDragType: (t: PrimitiveType | undefined) => void }) {
    return (
        <div
            style={{
                // Stick to the top on scroll, leaving a 40px gap above. `flex-start` keeps the panel
                // hugging its content height (a stretched flex item can't stick).
                alignSelf: 'flex-start',
                background: C.panelBg,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                color: C.textStrong,
                flexShrink: 0,
                order: 1,
                overflow: 'hidden',
                position: 'sticky',
                top: 40,
                width: 150,
            }}
        >
            <div style={{ borderBottom: `1px solid ${C.line}`, color: C.textSoft, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', padding: '10px 14px', textTransform: 'uppercase' }}>
                Primitives
            </div>
            {PRIMITIVE_TYPES.map((t, i) => (
                <div
                    key={t}
                    draggable
                    onDragStart={e => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('text/plain', `new:${t}`);
                        onDragType(t);
                    }}
                    onDragEnd={() => onDragType(undefined)}
                    className="flex items-center gap-2"
                    style={{
                        borderTop: i ? `1px solid rgba(255,255,255,0.06)` : undefined,
                        cursor: 'grab',
                        fontSize: 13,
                        padding: '10px 14px',
                    }}
                >
                    <span style={{ color: C.textGhost, flexShrink: 0 }}>⠿</span>
                    {/* A live preview of the real primitive (pointer-events off so the row owns the drag).
                        Raw data is a big block — show its label instead. */}
                    {t === 'rawdata' ? (
                        <span>{PRIMITIVE_META[t].label}</span>
                    ) : (
                        <span style={{ minWidth: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                            {renderPrimitive(t, PRIMITIVE_META[t].defaultConfig)}
                        </span>
                    )}
                </div>
            ))}
            <div style={{ color: C.textGhost, fontSize: 10, lineHeight: 1.4, padding: '10px 14px' }}>Drag into a row to add.</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Settings spoiler + conventions (box-model layer controls)
// ---------------------------------------------------------------------------

interface SettingsProps {
    enabled: boolean;
    setEnabled: (v: boolean) => void;
    conf: Record<LayerKey, LayerConf>;
    setColor: (k: LayerKey, color: string) => void;
    setMode: (k: LayerKey, mode: Mode) => void;
    baseline: BaselineConf;
    setBaseline: React.Dispatch<React.SetStateAction<BaselineConf>>;
    rulers: boolean;
    setRulers: (v: boolean) => void;
    pads: boolean;
    setPads: (v: boolean) => void;
}

function SettingsSpoiler({ enabled, setEnabled, conf, setColor, setMode, baseline, setBaseline, rulers, setRulers, pads, setPads }: SettingsProps) {
    const [open, setOpen] = useSessionState('open', false);
    return (
        <div style={{ background: C.panelBg, border: `1px solid ${C.line}`, borderRadius: 12, color: C.textStrong }}>
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
                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setRulers(!rulers);
                        }}
                        className="flex items-center gap-2"
                        style={{ cursor: 'pointer', padding: '10px 0' }}
                    >
                        <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                            <Switch checked={rulers} onChange={setRulers} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Line rulers</span>
                    </span>
                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setPads(!pads);
                        }}
                        className="flex items-center gap-2"
                        style={{ cursor: 'pointer', padding: '10px 0' }}
                    >
                        <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                            <Switch checked={pads} onChange={setPads} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Paddings</span>
                    </span>
                </span>
                <span className="flex items-center" style={{ padding: '10px 14px' }}>
                    <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                </span>
            </div>

            {open && (
                <div style={{ borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 16, padding: 14 }}>
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

function ConventionsPanel() {
    const [open, setOpen] = useSessionState('conventions-open', false);
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
                        <b style={{ color: C.textStrong }}>Goal.</b> A reusable baseline grid so ANY base primitive snaps together like Lego
                        in one wrapping row — every element in a row sits on the same baseline and is the same height.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Rhythm lives in a wrapper.</b> A row has a vertical size {term('R')}; each element is
                        wrapped and the wrapper pads it to exactly {term('R')} tall: {term('pt + h + pb = R')} ({term('h')} = the element&apos;s own
                        box height). The primitive keeps its own padding — the pill of a Badge, the chrome of a Button — untouched.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Strategy B.</b> The baseline is baked into {term('pt')} and rows align to the{' '}
                        <b>top</b> ({term('flex-start')}) — so a foreign/un-slotted element can&apos;t drag the row&apos;s alignment.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Per-type tuning.</b> Offsets are keyed by (row, type, size). KeyLabel is already tuned
                        (and skeletons of height {term('L')} reuse it); the other primitives start at zero. Click an element to tune {term('pt/pb')}
                        and edit its size / colour / icon / text.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Compose.</b> Drag a primitive from the right panel into a row; drag within a row to
                        reorder; open an element and use the trash button to remove it (with undo). Set {term('b(R)')} per row; zoom to check
                        sub-pixel; <b>Copy TS</b> / <b>Copy prompt</b> export
                        the whole tuned {term('PRIMITIVE_VGRIDS')}.
                    </li>
                    <li style={item}>
                        <b style={{ color: C.textStrong }}>Save / share / import a scene.</b> Row composition is a session sandbox — it lives in{' '}
                        {term('sessionStorage')}. The toolbar&apos;s <b>⋯</b> menu handles the rest: <b>Copy scene</b> serialises the current layout
                        (element {term('type')} + {term('config')}; ids are minted fresh on load, empty rows seed empty), and{' '}
                        <b>Import scene…</b> lets you paste one back in and see it identically. To make an arrangement the DEFAULT the gallery opens
                        with, paste a copied scene over the {term('SEED_ROW_CONTENTS')} literal in{' '}
                        {term('storybook-design/slices/label/primitives-vgrid.ts')} (or hand <b>Copy scene prompt</b> to an assistant to do it).
                    </li>
                </ul>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export toolbar
// ---------------------------------------------------------------------------

/** One row in the actions dropdown. Hover highlight is inline (Tailwind isn't scanned here). */
function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    const [hover, setHover] = React.useState(false);
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="flex w-full items-center gap-2"
            style={{
                background: hover ? 'rgba(255,255,255,0.07)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: C.textStrong,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                padding: '7px 10px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
            }}
        >
            <span className="flex items-center" style={{ color: C.textSoft, flexShrink: 0 }}>
                {icon}
            </span>
            {label}
        </button>
    );
}

/** The "⋯" dropdown holding the scene actions (copy TS / copy prompt / import). */
function ActionsMenu({ onCopyScene, onCopyPrompt, onImport }: { onCopyScene: () => void; onCopyPrompt: () => void; onImport: () => void }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    useDismiss(open, () => setOpen(false), rootRef);
    const run = (fn: () => void) => () => {
        fn();
        setOpen(false);
    };
    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            <button
                type="button"
                aria-label="More scene actions"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-center"
                style={{
                    background: open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    color: C.textStrong,
                    cursor: 'pointer',
                    height: 30,
                    width: 34,
                }}
            >
                <MoreHorizontal size={16} />
            </button>
            {open && (
                <div
                    role="menu"
                    style={{
                        background: '#202523',
                        border: `1px solid ${C.line}`,
                        borderRadius: 8,
                        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 200,
                        padding: 6,
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 6px)',
                        zIndex: 1000,
                    }}
                >
                    <MenuItem icon={<Copy size={14} />} label="Copy scene" onClick={run(onCopyScene)} />
                    <MenuItem icon={<FileText size={14} />} label="Copy scene prompt" onClick={run(onCopyPrompt)} />
                    <div style={{ borderTop: `1px solid ${C.line}`, margin: '4px 0' }} />
                    <MenuItem icon={<Upload size={14} />} label="Import scene…" onClick={run(onImport)} />
                </div>
            )}
        </div>
    );
}

/** Modal to paste a copied scene. `onImport` returns an error message, or undefined on success. */
function ImportSceneDialog({ onClose, onImport }: { onClose: () => void; onImport: (text: string) => string | undefined }) {
    const [text, setText] = React.useState('');
    const [error, setError] = React.useState<string | undefined>(undefined);
    const ready = text.trim().length > 0;
    const submit = () => {
        const err = onImport(text);
        if (err) setError(err);
        else onClose();
    };
    return createPortal(
        <div
            onClick={onClose}
            style={{ alignItems: 'center', background: 'rgba(0,0,0,0.6)', display: 'flex', inset: 0, justifyContent: 'center', position: 'fixed', zIndex: 3000 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: C.panelBg,
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                    color: C.textStrong,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    maxWidth: '90vw',
                    padding: 18,
                    width: 540,
                }}
            >
                <div style={{ fontSize: 14, fontWeight: 600 }}>Import scene</div>
                <p style={{ color: C.textSoft, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    Paste a scene copied with <b style={{ color: C.textStrong }}>Copy scene</b> (a <code style={{ color: C.textStrong }}>SEED_ROW_CONTENTS</code>{' '}
                    export). It replaces the current row layout; the tuned offsets and baselines are left untouched.
                </p>
                <textarea
                    autoFocus
                    value={text}
                    spellCheck={false}
                    onChange={e => {
                        setText(e.target.value);
                        setError(undefined);
                    }}
                    placeholder="export const SEED_ROW_CONTENTS: readonly SeedRow[] = [ … ];"
                    style={{
                        background: '#0e100f',
                        border: `1px solid ${error ? C.danger : C.line}`,
                        borderRadius: 8,
                        color: C.textStrong,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        minHeight: 200,
                        padding: 10,
                        resize: 'vertical',
                        width: '100%',
                    }}
                />
                {error && <div style={{ color: C.danger, fontSize: 12 }}>{error}</div>}
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 6, color: C.textStrong, cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: '6px 12px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!ready}
                        style={{
                            background: ready ? C.accent : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: 6,
                            color: ready ? '#06251b' : C.textSoft,
                            cursor: ready ? 'pointer' : 'default',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '6px 14px',
                        }}
                    >
                        Import
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function ExportToolbar({
    grids,
    baselines,
    rowContents,
    onImportScene,
    zoom,
    onZoomChange,
}: {
    grids: PrimitiveGrids;
    baselines: Partial<Record<RowSize, number>>;
    rowContents: Partial<Record<RowKey, ElementInstance[]>>;
    onImportScene: (text: string) => string | undefined;
    zoom: number;
    onZoomChange: (z: number) => void;
}) {
    const [importing, setImporting] = React.useState(false);
    const copy = (t: string) => navigator.clipboard?.writeText(t).catch(() => {});
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
            <span style={{ marginRight: 'auto' }}>
                <ZoomControl value={zoom} onChange={onZoomChange} />
            </span>
            {/* Tuning export: the per-(row,type,size) offsets + baselines. */}
            <CopyButton text={gridsToTs(grids, baselines)} label="Copy TS" />
            <CopyButton text={gridsToPrompt(grids, baselines)} label="Copy prompt" />
            {/* Scene: copy the composed layout (as the standard seed) or import a pasted one. */}
            <ActionsMenu
                onCopyScene={() => copy(rowContentsToTs(rowContents))}
                onCopyPrompt={() => copy(rowContentsToPrompt(rowContents))}
                onImport={() => setImporting(true)}
            />
            {importing && <ImportSceneDialog onClose={() => setImporting(false)} onImport={onImportScene} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Row — drop zone with reorderable cubes + baseline rule + b(R) control
// ---------------------------------------------------------------------------

/** Insertion index for a drop at `clientX`, by cube midpoints. */
function insertionIndex(container: HTMLElement, clientX: number): number {
    const cubes = Array.from(container.querySelectorAll<HTMLElement>('[data-cube]'));
    for (let i = 0; i < cubes.length; i++) {
        const r = cubes[i].getBoundingClientRect();
        if (clientX < r.left + r.width / 2) return i;
    }
    return cubes.length;
}

// A row is either a fixed vertical-size R, or the freeform "test line" whose
// container box (height + pt/pb + gap) you tune directly instead of per-element.
type RowKey = RowSize | 'test';

interface TestLineCfg {
    /** When true the group hugs its content (natural element heights); otherwise it's a fixed vgrid
     *  row at `height` with tuned per-element offsets. */
    auto: boolean;
    /** When true the group spans 100% of the row; otherwise it's `width` px wide. */
    fullWidth: boolean;
    gap: number;
    height: RowSize;
    pb: number;
    pt: number;
    width: number;
}

/** Which tab the test block shows: the freeform test line, or the inline-icon playground. */
type TestTab = 'line' | 'icon';

/** Segmented tab switch for the test block header. */
function TestTabBar({ value, onChange }: { value: TestTab; onChange: (t: TestTab) => void }) {
    const tabs: [TestTab, string][] = [
        ['line', 'Test line'],
        ['icon', 'Inline icon'],
    ];
    return (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, display: 'inline-flex', gap: 2, padding: 2 }}>
            {tabs.map(([t, label]) => {
                const active = value === t;
                return (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        style={{
                            background: active ? '#fff' : 'transparent',
                            border: 'none',
                            borderRadius: 4,
                            color: active ? '#171717' : C.textSoft,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.03em',
                            padding: '4px 10px',
                            textTransform: 'uppercase',
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

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------

/**
 * The multi-primitive vertical-rhythm editor. A dark spoiler drives the box-model
 * visualisation and the shared baseline rule. The right panel is a palette of the
 * six base primitives; drag one into a row to add it, drag within a row to reorder.
 * Click an element to tune its wrapper `pt`/`pb` (so `pt + h + pb = R`
 * and its baseline lands on the row's b(R)) and edit its size / colour / icon /
 * text. The whole tuned grid exports via the toolbar (Copy TS / Copy prompt).
 */
export function PrimitivesInspector() {
    const [enabled, setEnabled] = useSessionState('enabled', true);
    const [conf, setConf] = useSessionState<Record<LayerKey, LayerConf>>('conf', DEFAULT_CONF);
    const setColor = (k: LayerKey, color: string) => setConf(c => ({ ...c, [k]: { ...c[k], color } }));
    const setMode = (k: LayerKey, mode: Mode) => setConf(c => ({ ...c, [k]: { ...c[k], mode } }));

    const [baseline, setBaseline] = useSessionState<BaselineConf>('baselineConf', DEFAULT_BASELINE);

    // Working state (px, session-persisted): per-type offset grids, per-row baselines, row contents.
    const [grids, setGrids] = useSessionState<PrimitiveGrids>('grids', seedGrids);
    const [rowBaselines, setRowBaselines] = useSessionState<Partial<Record<RowSize, number>>>('rowBaselines', seedBaselines);
    const [rowContents, setRowContents] = useSessionState<Partial<Record<RowKey, ElementInstance[]>>>('rowContents', seedRowContents);
    // Per-row horizontal spacing between elements (px). Defaults to DEFAULT_GAP.
    const [rowGaps, setRowGaps] = useSessionState<Partial<Record<RowSize, number>>>('rowGaps', {});
    const setRowGap = (row: RowSize, px: number) => setRowGaps(g => ({ ...g, [row]: px }));

    // Per-row vertical padding of the ruled band (px). Defaults: 8 above, 16 below (the old constants).
    // Per-row symmetric vertical padding of the ruled band (px, applied top and bottom).
    const [rowPadY, setRowPadY] = useSessionState<Partial<Record<RowSize, number>>>('rowPadY', {});
    const rowPadYOf = (row: RowSize) => rowPadY[row] ?? 8;
    const setRowPadYValue = (row: RowSize, px: number) => setRowPadY(p => ({ ...p, [row]: px }));
    // Toggle for the faint gray band rules.
    const [rulers, setRulers] = useSessionState('rulers', true);
    // Toggle for the per-row padding boundary lines (drawn at the top/bottom of the padded band).
    const [pads, setPads] = useSessionState('pads', true);

    // The freeform "test line": tune the group container's own box directly.
    const [testCfg, setTestCfg] = useSessionState<TestLineCfg>('testLine', { auto: false, fullWidth: true, gap: DEFAULT_GAP, height: 24, pb: 8, pt: 8, width: 320 });
    // Which tab the test block shows (test line vs inline-icon playground).
    const [testTab, setTestTab] = useSessionState<TestTab>('testTab', 'line');
    // The inline-icon tuning grid lives here (not in InlineIconInspector) so the Copy TS/prompt
    // buttons in the tab row stay in sync with the editor.
    const [iconGrid, setIconGrid] = useSessionState<InlineIconGrid>('iconGrid', seedInlineIconGrid);

    const offsetOf = (type: PrimitiveType, config: ElementConfig, row: RowSize): Offset =>
        grids[gridTypeOf(type)]?.[row]?.[sizeKeyOf(type, config)] ?? { pb: 0, pt: 0 };

    const setOffset = (type: PrimitiveType, config: ElementConfig, row: RowSize, off: Offset) =>
        setGrids(g => {
            const gt = gridTypeOf(type);
            const key = sizeKeyOf(type, config);
            const rowCells = { ...(g[gt]?.[row] ?? {}), [key]: off };
            return { ...g, [gt]: { ...g[gt], [row]: rowCells } };
        });

    const setConfig = (row: RowKey, id: string, config: ElementConfig) =>
        setRowContents(rc => ({ ...rc, [row]: (rc[row] ?? []).map(el => (el.id === id ? { ...el, config } : el)) }));

    const setRowBaseline = (row: RowSize, px: number) => setRowBaselines(b => ({ ...b, [row]: px }));

    // The single open cell popover, keyed by element id.
    const [sel, setSel] = React.useState<string | undefined>(undefined);

    // Deletion with a 6-second undo. `deleted` snapshots the removed element + its slot; the undo
    // snackbar restores it exactly. The timer clears the snapshot when it lapses.
    const [deleted, setDeleted] = React.useState<{ row: RowKey; index: number; instance: ElementInstance } | undefined>(undefined);
    const undoTimer = React.useRef<number | undefined>(undefined);
    React.useEffect(() => () => window.clearTimeout(undoTimer.current), []);

    const deleteEl = (row: RowKey, id: string) => {
        const list = rowContents[row] ?? [];
        const index = list.findIndex(el => el.id === id);
        if (index < 0) return;
        setDeleted({ index, instance: list[index], row });
        setRowContents(rc => ({ ...rc, [row]: (rc[row] ?? []).filter(el => el.id !== id) }));
        setSel(prev => (prev === id ? undefined : prev));
        window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setDeleted(undefined), 6000);
    };

    const undoDelete = () => {
        if (!deleted) return;
        const { row, index, instance } = deleted;
        setRowContents(rc => {
            const list = [...(rc[row] ?? [])];
            list.splice(Math.min(index, list.length), 0, instance);
            return { ...rc, [row]: list };
        });
        setDeleted(undefined);
        window.clearTimeout(undoTimer.current);
    };

    // Import a scene pasted from "Copy scene": parse + validate, then replace the whole row
    // layout (tuning/baselines untouched). Returns an error message, or null on success.
    const importScene = (text: string): string | undefined => {
        try {
            setRowContents(sceneToRowContents(parseScene(text)));
            setSel(undefined);
            setDeleted(undefined);
            return undefined;
        } catch (e) {
            return e instanceof Error ? e.message : 'Could not import the pasted scene.';
        }
    };

    const [zoom, setZoom] = useSessionState('zoom', 1);

    // Drag state. `drag` describes what's being dragged; `overRow`/`overIndex` the live drop target.
    const dragRef = React.useRef<{ kind: 'new'; type: PrimitiveType } | { kind: 'move'; row: RowKey; id: string } | undefined>(undefined);
    const [overRow, setOverRow] = React.useState<RowKey | undefined>(undefined);
    const [overIndex, setOverIndex] = React.useState<number>(-1);

    const clearDrag = () => {
        dragRef.current = undefined;
        setOverRow(undefined);
        setOverIndex(-1);
    };

    const handleDrop = (row: RowKey, index: number) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (drag.kind === 'new') {
            const type = drag.type;
            const inst: ElementInstance = { config: { ...PRIMITIVE_META[type].defaultConfig }, id: makeId(type), type };
            setRowContents(rc => {
                const next = [...(rc[row] ?? [])];
                next.splice(index, 0, inst);
                return { ...rc, [row]: next };
            });
        } else {
            const { row: fromRow, id } = drag;
            setRowContents(rc => {
                const from = rc[fromRow] ?? [];
                const moving = from.find(el => el.id === id);
                if (!moving) return rc;
                const next = { ...rc };
                next[fromRow] = from.filter(el => el.id !== id);
                // If moving within the same row, the removal shifts indices left of `index`.
                let insertAt = index;
                if (fromRow === row) {
                    const oldIndex = from.findIndex(el => el.id === id);
                    if (oldIndex < index) insertAt -= 1;
                }
                const target = [...(next[row] ?? [])];
                target.splice(insertAt, 0, moving);
                next[row] = target;
                return next;
            });
        }
        clearDrag();
    };

    // The cubes + drop-insertion markers for a row's contents. `rowKey` is the content/drag identity;
    // `offsetRow` is the grid row R used for per-element offsets + the fit check (for the test line it's
    // the selected height, so elements re-pad to that R's baseline and go red when they don't fit).
    const dropMarker = <span style={{ alignSelf: 'stretch', background: C.accent, borderRadius: 1, width: 2 }} />;
    const renderContents = (rowKey: RowKey, contents: ElementInstance[], offsetRow: RowSize) => (
        <>
            {contents.length === 0 && <span style={{ color: C.textGhost, fontSize: 11, padding: '2px 0' }}>drop a primitive here</span>}
            {contents.map((inst, i) => (
                <React.Fragment key={inst.id}>
                    {overRow === rowKey && overIndex === i && dropMarker}
                    <InspectableCube
                        instance={inst}
                        row={offsetRow}
                        offset={offsetOf(inst.type, inst.config, offsetRow)}
                        onOffsetChange={off => setOffset(inst.type, inst.config, offsetRow, off)}
                        onConfigChange={config => setConfig(rowKey, inst.id, config)}
                        onDelete={() => deleteEl(rowKey, inst.id)}
                        conf={conf}
                        enabled={enabled}
                        selected={sel === inst.id}
                        onToggle={() => setSel(prev => (prev === inst.id ? undefined : inst.id))}
                        onClose={() => setSel(prev => (prev === inst.id ? undefined : prev))}
                        zoom={zoom}
                        onDragStart={() => {
                            dragRef.current = { id: inst.id, kind: 'move', row: rowKey };
                        }}
                        onDragEnd={clearDrag}
                    />
                </React.Fragment>
            ))}
            {overRow === rowKey && overIndex >= contents.length && dropMarker}
        </>
    );

    // A drop zone's handlers, shared by the test line and the regular rows.
    const dropHandlers = (rowKey: RowKey) => ({
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (!dragRef.current) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = dragRef.current.kind === 'new' ? 'copy' : 'move';
            setOverRow(rowKey);
            setOverIndex(insertionIndex(e.currentTarget, e.clientX));
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            handleDrop(rowKey, insertionIndex(e.currentTarget, e.clientX));
        },
    });

    const numInput = (value: number, onChange: (v: number) => void) => <NumField value={value} onChange={onChange} />;

    const testContents = rowContents.test ?? [];
    // Measure the test line's real rendered height so the title is honest in both modes (fixed R, or
    // auto where it hugs content / an oversized element).
    const testRef = React.useRef<HTMLDivElement>(null);
    const [testMeasured, setTestMeasured] = React.useState(0);
    React.useLayoutEffect(() => {
        const el = testRef.current;
        if (!el) return;
        const update = () => setTestMeasured(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    });

    return (
        <div className="flex flex-col gap-8">
            <ExportToolbar grids={grids} baselines={rowBaselines} rowContents={rowContents} onImportScene={importScene} zoom={zoom} onZoomChange={setZoom} />
            <SettingsSpoiler
                enabled={enabled}
                setEnabled={setEnabled}
                conf={conf}
                setColor={setColor}
                setMode={setMode}
                baseline={baseline}
                setBaseline={setBaseline}
                rulers={rulers}
                setRulers={setRulers}
                pads={pads}
                setPads={setPads}
            />

            <div style={{ alignItems: 'flex-start', display: 'flex', gap: 24 }}>
                <Palette
                    onDragType={t => {
                        dragRef.current = t ? { kind: 'new', type: t } : undefined;
                        if (!t) clearDrag();
                    }}
                />

                <div className="flex flex-col gap-8" style={{ flex: 1, minWidth: 0 }}>
                    {/* TEST LINE — a freeform container: tune its own height + pt/pb + gap directly
                        (instead of per-element offsets). Full outer height is shown by the title. */}
                    <div className="flex flex-col gap-2" style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                        {/* Fixed height so the tabs don't shift vertically when the copy buttons
                            (icon tab only) toggle in/out of this row. */}
                        <div className="flex items-center gap-3" style={{ minHeight: 30 }}>
                            <TestTabBar value={testTab} onChange={setTestTab} />
                            {testTab === 'icon' && (
                                <span className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                                    <CopyButton text={inlineIconToTs(iconGrid)} label="Copy TS" />
                                    <CopyButton text={inlineIconToPrompt(iconGrid)} label="Copy prompt" />
                                </span>
                            )}
                        </div>
                        {testTab === 'icon' && <InlineIconInspector grid={iconGrid} onGridChange={setIconGrid} />}
                        {testTab === 'line' && (
                            <>
                                <div
                                    className="flex items-center gap-3"
                                    style={{ color: C.textFaint, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                                >
                            <span className="flex items-center gap-2">
                                <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                                    <Switch checked={testCfg.auto} onChange={v => setTestCfg(c => ({ ...c, auto: v }))} />
                                </span>
                                <span>auto height</span>
                            </span>
                            <span style={{ color: C.textSoft }}>full height {testMeasured}px</span>
                            <span className="flex items-center gap-2">
                                <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                                    <Switch checked={testCfg.fullWidth} onChange={v => setTestCfg(c => ({ ...c, fullWidth: v }))} />
                                </span>
                                <span>full width</span>
                            </span>
                            <span style={{ display: 'inline-flex', opacity: testCfg.fullWidth ? 0.4 : 1, pointerEvents: testCfg.fullWidth ? 'none' : undefined }}>
                                {numInput(testCfg.width, v => setTestCfg(c => ({ ...c, width: v })))}
                            </span>
                        </div>
                        <div style={{ alignItems: 'flex-start', display: 'flex', gap: 12 }}>
                            <div {...dropHandlers('test')} style={{ flex: 1, minWidth: 0, padding: '8px 0 16px' }}>
                                <div
                                    ref={testRef}
                                    style={{
                                        alignItems: 'flex-start',
                                        // Only top/bottom rules (no side borders); inset shadow so it doesn't affect layout.
                                        boxShadow: `inset 0 1px 0 ${C.line}, inset 0 -1px 0 ${C.line}`,
                                        boxSizing: 'content-box',
                                        columnGap: testCfg.gap,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        // Auto: grow to fit content but never below the selected height (min = R).
                                        // Fixed: exactly R tall (taller content overflows). Elements keep their vgrid
                                        // offsets in BOTH modes — only the wrapper's sizing changes.
                                        height: testCfg.auto ? undefined : testCfg.height,
                                        minHeight: testCfg.auto ? testCfg.height : undefined,
                                        paddingBottom: testCfg.pb,
                                        paddingTop: testCfg.pt,
                                        position: 'relative',
                                        rowGap: 0,
                                        // 100% (fill the row) or a fixed px width.
                                        width: testCfg.fullWidth ? undefined : testCfg.width,
                                    }}
                                >
                                    {renderContents('test', testContents, testCfg.height)}
                                    {/* Baseline b(R) of the selected height (elements keep their offsets in both modes). */}
                                    {baseline.visible && (
                                        <div
                                            style={{
                                                borderTop: `${baseline.thickness}px solid ${baseline.color}`,
                                                left: 0,
                                                pointerEvents: 'none',
                                                position: 'absolute',
                                                right: 0,
                                                top: testCfg.pt + (rowBaselines[testCfg.height] ?? Math.round(testCfg.height * 0.75)),
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 6, paddingBottom: 16 }}>
                                {/* Group height (min height in auto) snaps to a grid row size. */}
                                <label style={{ alignItems: 'center', display: 'flex', fontSize: 11, gap: 6, justifyContent: 'flex-end' }}>
                                    <span style={{ color: C.textSoft }}>height</span>
                                    <span style={{ width: 70 }}>
                                        <Select
                                            value={String(testCfg.height)}
                                            options={ROW_SIZES.map(String)}
                                            onChange={v => {
                                                const h = ROW_SIZES.find(r => String(r) === v);
                                                if (h) setTestCfg(c => ({ ...c, height: h }));
                                            }}
                                        />
                                    </span>
                                </label>
                                {(
                                    [
                                        ['pt', testCfg.pt, (v: number) => setTestCfg(c => ({ ...c, pt: v }))],
                                        ['pb', testCfg.pb, (v: number) => setTestCfg(c => ({ ...c, pb: v }))],
                                        ['gap', testCfg.gap, (v: number) => setTestCfg(c => ({ ...c, gap: v }))],
                                    ] as const
                                ).map(([label, value, onChange]) => (
                                    <label key={label} style={{ alignItems: 'center', display: 'flex', fontSize: 11, gap: 6, justifyContent: 'flex-end' }}>
                                        <span style={{ color: C.textSoft }}>{label}</span>
                                        {numInput(value, onChange)}
                                    </label>
                                ))}
                            </div>
                        </div>
                            </>
                        )}
                    </div>

                    {ROW_SIZES.map(row => {
                        const rowBaseline = rowBaselines[row] ?? Math.round(row * 0.75);
                        const contents = rowContents[row] ?? [];
                        const py = rowPadYOf(row);
                        return (
                            <div key={row} className="flex flex-col gap-2">
                                <div
                                    className="flex items-center gap-3"
                                    style={{ color: C.textFaint, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                                >
                                    <span>vertical size {row}px</span>
                                    <GapInput value={rowGaps[row] ?? DEFAULT_GAP} onChange={px => setRowGap(row, px)} />
                                    <GapInput label="py" value={py} onChange={px => setRowPadYValue(row, px)} />
                                </div>
                                <div style={{ alignItems: 'flex-end', display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0, overflowX: zoom > 1 ? 'auto' : undefined }}>
                                        <div {...dropHandlers(row)} style={{ ...ruledStyle(row, py, rulers, pads), zoom: zoom > 1 ? zoom : undefined }}>
                                            <div
                                                style={{
                                                    alignItems: 'flex-start',
                                                    columnGap: rowGaps[row] ?? DEFAULT_GAP,
                                                    display: 'flex',
                                                    flexWrap: zoom > 1 ? 'nowrap' : 'wrap',
                                                    justifyContent: 'flex-start',
                                                    minHeight: row,
                                                    position: 'relative',
                                                    rowGap: 0,
                                                    width: zoom > 1 ? 'max-content' : undefined,
                                                }}
                                            >
                                                {renderContents(row, contents, row)}
                                                {baseline.visible && (
                                                    <div
                                                        style={{
                                                            borderTop: `${baseline.thickness}px solid ${baseline.color}`,
                                                            left: 0,
                                                            pointerEvents: 'none',
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: rowBaseline,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <label style={{ alignItems: 'center', display: 'flex', flexShrink: 0, fontSize: 11, gap: 6, paddingBottom: py }}>
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

            {deleted &&
                createPortal(
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#202523',
                            border: `1px solid ${C.line}`,
                            borderRadius: 8,
                            bottom: 24,
                            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                            color: C.textStrong,
                            display: 'flex',
                            gap: 12,
                            left: '50%',
                            padding: '10px 14px',
                            position: 'fixed',
                            transform: 'translateX(-50%)',
                            zIndex: 2000,
                        }}
                    >
                        <span style={{ fontSize: 12 }}>
                            <code style={{ color: C.accent }}>{PRIMITIVE_META[deleted.instance.type].label}</code> removed
                        </span>
                        <button
                            type="button"
                            onClick={undoDelete}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: `1px solid ${C.line}`,
                                borderRadius: 6,
                                color: C.textStrong,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '5px 10px',
                            }}
                        >
                            Undo
                        </button>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
