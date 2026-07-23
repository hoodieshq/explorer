import * as React from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, ExternalLink as ExternalLinkIcon, Info, Zap } from 'react-feather';

import { fontSizeOf, type IconCell, type InlineIconGrid, lineHeightOf, pxToEm } from '../label/inline-icon-vgrid';
import { KeyLabel } from '../label/key-label';
import { type LabelSizeName } from '../label/key-label-vgrid';
import { ICON_OPTIONS, LABEL_SIZE_NAMES } from '../label/primitives-vgrid';
import {
    type AnchorRect,
    type BaselineConf,
    C,
    createSessionState,
    DEFAULT_BASELINE,
    FloatingPopover,
    NumField,
    Select,
    Switch,
    useDismiss,
} from './ui-atoms';

// ---------------------------------------------------------------------------
// Icons — the same react-feather set the inspector offers, but typed to accept
// SVG props (so the icon can be told to fill its `em`-sized box via `style`).
// ---------------------------------------------------------------------------

type FeatherIcon = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;

const ICONS: Record<string, FeatherIcon> = {
    AlertTriangle,
    Check,
    ChevronDown,
    Copy,
    ExternalLink: ExternalLinkIcon,
    Info,
    Zap,
};

// This slice lives outside Tailwind's `content` glob, so styling is inline `style`.
const useSessionState = createSessionState('inline-icon-v1:');
// The baseline "rule" is the inspector's own persisted config — reused verbatim, not re-invented.
const useInspectorState = createSessionState('primitives-inspector-v1:');

const DEFAULT_TEXT =
    'Transaction executed successfully {i} on Solana mainnet, paying a small fee {i} for compute budget. ' +
    'The icon flows with the words and wraps like any other letter — try narrowing the column.';

// ---------------------------------------------------------------------------
// InlineIcon — a glyph-like icon inside a line of text.
// ---------------------------------------------------------------------------
//
// Pure-CSS placement: the slot is an inline-block whose height is the text's
// line-box (`slotHeightEm`), so it takes exactly one "text slot" and NEVER
// grows the line — even when the icon is bigger. `vertical-align: top` pins the
// slot to the line-box top; the icon is centred inside and overflows the slot
// symmetrically, then nudged onto the baseline. Because the slot is a normal
// inline box, it wraps to the next line with the surrounding words.

function InlineIcon({
    iconName,
    sizeEm,
    nudgeEm,
    slotHeightEm,
    showSlot,
    onOpen,
}: {
    iconName: string;
    sizeEm: number;
    nudgeEm: number;
    slotHeightEm: number;
    showSlot: boolean;
    onOpen: (anchor: AnchorRect) => void;
}) {
    const Cmp = ICONS[iconName] ?? Info;
    return (
        <span
            role="button"
            tabIndex={0}
            // Swallow pointer-down so the popover's outside-dismiss doesn't fire on the trigger
            // (which would close then immediately reopen); the click still opens/moves the popover.
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                onOpen({ bottom: r.bottom, left: r.left, top: r.top });
            }}
            style={{
                cursor: 'pointer',
                display: 'inline-block',
                height: `${slotHeightEm}em`,
                // Only an outline is toggled — never a border/margin — so the slot's box
                // (and therefore the line) is unaffected by the overlay.
                outline: showSlot ? `1px solid ${C.accent}` : undefined,
                overflow: 'visible',
                position: 'relative',
                verticalAlign: 'top',
                width: `${sizeEm}em`,
            }}
        >
            <span
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    height: `${sizeEm}em`,
                    justifyContent: 'center',
                    left: '50%',
                    position: 'absolute',
                    top: '50%',
                    // Centre in the slot, then nudge onto the text baseline.
                    transform: `translate(-50%, calc(-50% + ${nudgeEm}em))`,
                    width: `${sizeEm}em`,
                }}
            >
                {/* CSS width/height (100%) override the SVG's own size attributes, so the icon
                    fills the em-sized box and scales with the text. */}
                <Cmp style={{ display: 'block', height: '100%', width: '100%' }} />
            </span>
        </span>
    );
}

/** Split the demo text on the `{i}` marker and interleave inline icons. With no
 *  marker, one icon is appended at the end. */
function renderWithIcons(text: string, makeIcon: (key: number) => React.ReactNode): React.ReactNode {
    const parts = text.split('{i}');
    if (parts.length === 1) {
        return (
            <>
                {text}
                {makeIcon(0)}
            </>
        );
    }
    const out: React.ReactNode[] = [];
    parts.forEach((seg, i) => {
        if (seg) out.push(<React.Fragment key={`t${i}`}>{seg}</React.Fragment>);
        if (i < parts.length - 1) out.push(makeIcon(i));
    });
    return <>{out}</>;
}

// ---------------------------------------------------------------------------
// Baseline overlay — reuse the inspector's BaselineConf to draw the rule on
// every wrapped line via a repeating gradient at line-height intervals.
// ---------------------------------------------------------------------------

/** Approximate distance (px) from a line-box top to the text baseline: the em-box
 *  is centred in the line-box, and the baseline sits ~0.8·font-size below the
 *  em-box top. A tuning aid — the adjacent glyphs are the exact reference. */
function baselineOffset(size: LabelSizeName): number {
    const fs = fontSizeOf(size);
    const lh = lineHeightOf(size);
    return (lh - fs) / 2 + fs * 0.8;
}

function baselineBackground(size: LabelSizeName, conf: BaselineConf): string {
    const lh = lineHeightOf(size);
    const b = baselineOffset(size);
    const t = conf.thickness;
    const c = conf.color;
    return (
        `repeating-linear-gradient(to bottom,` +
        ` transparent 0px, transparent ${b - t}px,` +
        ` ${c} ${b - t}px, ${c} ${b}px,` +
        ` transparent ${b}px, transparent ${lh}px)`
    );
}

// ---------------------------------------------------------------------------
// Editor controls
// ---------------------------------------------------------------------------

const rowStyle: React.CSSProperties = { alignItems: 'center', display: 'flex', gap: 8 };
const lblStyle: React.CSSProperties = { color: C.textSoft, flexShrink: 0, fontSize: 11 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label style={rowStyle}>
            <span style={lblStyle}>{label}</span>
            {children}
        </label>
    );
}

// ---------------------------------------------------------------------------
// Inline-icon inspector
// ---------------------------------------------------------------------------

/**
 * A focused playground for an icon placed INSIDE a line of KeyLabel text. Pick a
 * KeyLabel size (which fixes font-size + line-height from the scale), tune the
 * icon's size and vertical nudge in px (stored as `em`, per size), edit the text
 * and column width, and watch the icon wrap like a letter. The tuning `grid` is
 * owned by the parent (so its Copy TS/prompt buttons stay in sync).
 */
export function InlineIconInspector({ grid, onGridChange }: { grid: InlineIconGrid; onGridChange: React.Dispatch<React.SetStateAction<InlineIconGrid>> }) {
    const [size, setSize] = useSessionState<LabelSizeName>('size', 'base');
    const [iconName, setIconName] = useSessionState<string>('icon', 'Info');
    const [text, setText] = useSessionState<string>('text', DEFAULT_TEXT);
    const [width, setWidth] = useSessionState<number>('width', 280);
    const [showSlot, setShowSlot] = useSessionState<boolean>('showSlot', false);
    // The baseline rule is owned + toggled by the inspector's Settings spoiler; we only read it.
    const [baseline] = useInspectorState<BaselineConf>('baselineConf', DEFAULT_BASELINE);

    const [selected, setSelected] = React.useState<{ index: number; anchor: AnchorRect } | undefined>(undefined);
    // Dismiss on a pointer-down anywhere outside the popover itself. The icon trigger swallows its own
    // pointer-down (see InlineIcon), so clicking an icon opens/moves the popover instead of closing it.
    const popoverRef = React.useRef<HTMLDivElement>(null);
    useDismiss(selected != undefined, () => setSelected(undefined), popoverRef);

    // Text editing lives in its own popover, opened by clicking the preview text.
    const [textOpen, setTextOpen] = React.useState<AnchorRect | undefined>(undefined);
    const previewRef = React.useRef<HTMLDivElement>(null);
    const textPopoverRef = React.useRef<HTMLDivElement>(null);
    useDismiss(textOpen != undefined, () => setTextOpen(undefined), textPopoverRef);

    const cell: IconCell = grid[size];
    const fs = fontSizeOf(size);
    const lh = lineHeightOf(size);
    const slotHeightEm = lh / fs;

    const setCell = (patch: Partial<IconCell>) => onGridChange(g => ({ ...g, [size]: { ...g[size], ...patch } }));

    // Editor works in px; store em relative to the size's font-size. Round px for display.
    const sizePx = Math.round(cell.size * fs);
    const nudgePx = Math.round(cell.nudge * fs);
    const emLabel = (n: number) => `${Number(n.toFixed(3))}em`;

    // Embedded in the inspector's bordered test block, so no card chrome of its own.
    // Two columns: preview text on the left, the control stack pinned to the right edge.
    const panel: React.CSSProperties = {
        alignItems: 'flex-start',
        color: C.textStrong,
        display: 'flex',
        gap: 24,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={panel}>
                {/* Preview (left): a KeyLabel of `size`, capped to `width`, with the icon(s) inline.
                    Click the text (anywhere but an icon) to edit it in a popover. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        ref={previewRef}
                        onClick={() => {
                            const r = previewRef.current?.getBoundingClientRect();
                            if (r) setTextOpen({ bottom: r.bottom, left: r.left, top: r.top });
                        }}
                        style={{ cursor: 'text', position: 'relative', width }}
                    >
                        <KeyLabel size={size} maxWidth={width}>
                            {renderWithIcons(text, key => (
                                <InlineIcon
                                    key={`i${key}`}
                                    iconName={iconName}
                                    sizeEm={cell.size}
                                    nudgeEm={cell.nudge}
                                    slotHeightEm={slotHeightEm}
                                    showSlot={showSlot}
                                    onOpen={anchor => setSelected({ anchor, index: key })}
                                />
                            ))}
                        </KeyLabel>
                        {baseline.visible && (
                            <div
                                style={{
                                    backgroundImage: baselineBackground(size, baseline),
                                    inset: 0,
                                    pointerEvents: 'none',
                                    position: 'absolute',
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Controls (right edge), stacked in a column. */}
                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 10 }}>
                    <Field label="KeyLabel size">
                        <span style={{ width: 84 }}>
                            <Select
                                value={size}
                                options={LABEL_SIZE_NAMES}
                                onChange={v => {
                                    const s = LABEL_SIZE_NAMES.find(n => n === v);
                                    if (s) setSize(s);
                                }}
                            />
                        </span>
                    </Field>
                    <Field label="Icon">
                        <span style={{ width: 130 }}>
                            <Select value={iconName} options={ICON_OPTIONS} onChange={setIconName} />
                        </span>
                    </Field>
                    <Field label="Icon size">
                        <NumField value={sizePx} min={1} onChange={px => setCell({ size: pxToEm(px, size) })} />
                        <span style={{ color: C.textGhost, fontSize: 11 }}>px · {emLabel(cell.size)}</span>
                    </Field>
                    <Field label="Nudge">
                        <NumField value={nudgePx} min={-200} onChange={px => setCell({ nudge: pxToEm(px, size) })} />
                        <span style={{ color: C.textGhost, fontSize: 11 }}>px · {emLabel(cell.nudge)}</span>
                    </Field>
                    <Field label="Column">
                        <NumField value={width} min={40} onChange={setWidth} />
                        <span style={{ color: C.textGhost, fontSize: 11 }}>px</span>
                    </Field>
                    <label style={rowStyle}>
                        <Switch checked={showSlot} onChange={setShowSlot} />
                        <span style={lblStyle}>slot outline</span>
                    </label>
                </div>
            </div>

            {textOpen && (
                <FloatingPopover anchor={textOpen}>
                    <div
                        ref={textPopoverRef}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#202523',
                            border: `1px solid ${C.line}`,
                            borderRadius: 8,
                            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            padding: 10,
                            width: 320,
                        }}
                    >
                        <span style={lblStyle}>Text — use {'{i}'} to place an icon (else it lands at the end)</span>
                        <textarea
                            autoFocus
                            rows={4}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            style={{
                                background: C.panelBg,
                                border: `1px solid ${C.line}`,
                                borderRadius: 6,
                                color: C.textStrong,
                                fontSize: 12,
                                padding: '6px 8px',
                                resize: 'vertical',
                                width: '100%',
                            }}
                        />
                    </div>
                </FloatingPopover>
            )}

            {selected && (
                <FloatingPopover anchor={selected.anchor}>
                    <div
                        ref={popoverRef}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#202523',
                            border: `1px solid ${C.line}`,
                            borderRadius: 8,
                            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                            color: C.textStrong,
                            fontSize: 12,
                            padding: '10px 12px',
                            width: 200,
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>
                            <code style={{ color: C.accent }}>{iconName}</code>
                        </div>
                        <div style={{ color: C.textSoft, marginTop: 4 }}>
                            Inline icon · {size} · {emLabel(cell.size)}
                        </div>
                    </div>
                </FloatingPopover>
            )}
        </div>
    );
}
