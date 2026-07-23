// ---------------------------------------------------------------------------
// Shared dark-themed UI atoms for the PrimitivesGallery editors.
// ---------------------------------------------------------------------------
//
// These small pieces were born inside `primitives-inspector.tsx`; they are now
// shared with the inline-icon inspector. Logic is unchanged — only the home
// moved. Like the rest of this slice, everything is styled with inline `style`
// (this folder lives outside Tailwind's `content` glob, so utility classes not
// also used under `app/` generate no CSS).

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Copy } from 'react-feather';

// The shared dark palette.
export const C = {
    accent: '#10b981',
    danger: '#ff5a52',
    line: 'rgba(255,255,255,0.14)',
    panelBg: '#181c1a',
    textFaint: 'rgba(255,255,255,0.4)',
    textGhost: 'rgba(255,255,255,0.28)',
    textSoft: 'rgba(255,255,255,0.5)',
    textStrong: '#fff',
};

// ---------------------------------------------------------------------------
// Baseline overlay config — the red "rule" both editors draw. Shared so the
// inline-icon inspector reuses the SAME persisted config the inspector edits.
// ---------------------------------------------------------------------------

export interface BaselineConf {
    color: string;
    thickness: number;
    visible: boolean;
}

export const DEFAULT_BASELINE: BaselineConf = { color: '#ff3b30ff', thickness: 1, visible: true };

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

/** Build a `useSessionState` hook bound to a storage-key `prefix`, so each editor
 *  keeps its own namespace while sharing the implementation. Values survive a
 *  reload (best-effort — storage may be unavailable). */
export function createSessionState(prefix: string) {
    return function useSessionState<T>(key: string, initial: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
        const storageKey = prefix + key;
        const [value, setValue] = React.useState<T>(() => {
            try {
                const raw = sessionStorage.getItem(storageKey);
                if (raw != undefined) return JSON.parse(raw);
            } catch {
                /* fall through */
            }
            return initial instanceof Function ? initial() : initial;
        });
        React.useEffect(() => {
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(value));
            } catch {
                /* storage unavailable — persistence is best-effort */
            }
        }, [storageKey, value]);
        return [value, setValue];
    };
}

/** Close `open` on Escape or a pointer-down outside `ref`. */
export function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
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
// Controls
// ---------------------------------------------------------------------------

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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

/** A numeric field you can actually clear: an empty value is kept while editing (never forced to 0)
 *  and reverts to the committed value on blur. Commits only a valid number. `ghost` = borderless
 *  until hover/focus (for the inline gap field). */
export function NumField({
    value,
    onChange,
    min = 0,
    step,
    ghost = false,
    width = 56,
    textAlign,
}: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    step?: number;
    ghost?: boolean;
    width?: number;
    textAlign?: 'center';
}) {
    const [text, setText] = React.useState(String(value));
    const [focused, setFocused] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    // Sync from the committed value only while idle, so typing/empty isn't clobbered.
    React.useEffect(() => {
        if (!focused) setText(String(value));
    }, [value, focused]);
    const active = focused || hovered;
    return (
        <input
            type="number"
            min={min}
            step={step}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onChange={e => {
                setText(e.target.value);
                const t = e.target.value.trim();
                if (t === '') return; // keep it empty while editing
                const n = Number(t);
                if (!Number.isNaN(n)) onChange(step ? Math.max(min, n) : Math.max(min, Math.round(n)));
            }}
            style={{
                background: ghost ? 'transparent' : C.panelBg,
                border: `1px solid ${ghost && !active ? 'transparent' : C.line}`,
                borderRadius: 6,
                color: ghost ? C.textSoft : C.textStrong,
                fontSize: 12,
                padding: ghost ? '2px 6px' : '4px 6px',
                textAlign,
                width,
            }}
        />
    );
}

/** A compact dark <select>, styled inline (Tailwind form styles aren't generated here). The native
 *  arrow is replaced by our own ChevronDown so its inset is controllable (4px right, matching the
 *  field's 4px top padding). `border-box` so `width` is the full outer size. */
export function Select({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
    return (
        <span style={{ display: 'block', position: 'relative', width: '100%' }}>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    appearance: 'none',
                    background: C.panelBg,
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    boxSizing: 'border-box',
                    color: C.textStrong,
                    fontSize: 12,
                    padding: '4px 22px 4px 6px',
                    width: '100%',
                }}
            >
                {options.map(o => (
                    <option key={o} value={o} style={{ background: C.panelBg }}>
                        {o}
                    </option>
                ))}
            </select>
            <ChevronDown size={12} style={{ color: C.textSoft, pointerEvents: 'none', position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }} />
        </span>
    );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
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

// ---------------------------------------------------------------------------
// Floating popover — a viewport-flipping panel portaled to <body>.
// ---------------------------------------------------------------------------

export interface AnchorRect {
    top: number;
    bottom: number;
    left: number;
}

export function FloatingPopover({ anchor, children }: { anchor: AnchorRect; children: React.ReactNode }) {
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
