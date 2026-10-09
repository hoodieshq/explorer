import 'client-only';

import { type RefObject, useEffect } from 'react';

// REVIEW(HOO-1971): part of the row highlight variant; remove with it.

// The card ground (`dk-gray-800-dark`, OKLCH lightness 0.254) maps to the row tint's lightness; every other ground
// scales by the same ratio, so a lighter ground stays lighter.
const CARD_GROUND_LIGHTNESS = 0.254;
const TONED_LIGHTNESS = 0.215;
const TONE_CHROMA = 0.018;
const TONE_HUE = 92;
// Colours with more chroma than this carry a meaning (type badges, Mutable / Signer, the yellow selector) and keep it.
const NEUTRAL_CHROMA = 0.04;
// Text this light is the primary white and stays white; dimmer grey text (labels, table heads) takes the tone.
const PRIMARY_TEXT_LIGHTNESS = 0.9;
// A light edge for fields, so a dark input still reads as a field on the toned ground.
const FIELD_EDGE = `oklch(0.5 0.03 ${TONE_HUE})`;
const FIELD_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const;

/**
 * While `active`, tones the neutral colours inside `ref` toward the `custom-idl` hue and keeps doing so for content
 * added later (a tab switch, an expanded row): grounds at a lightness proportional to their own, grey text and
 * borders at their own lightness, and fields get a light edge. Restores everything when `active` turns off or the
 * element unmounts.
 */
export function useCustomIdlToning(ref: RefObject<HTMLElement | null>, active: boolean) {
    useEffect(() => {
        const root = ref.current;
        if (!active || !root) return;
        const originals = new Map<HTMLElement, Map<string, string>>();

        const set = (element: HTMLElement, property: string, value: string | undefined) => {
            if (!value) return;
            const saved = originals.get(element) ?? new Map<string, string>();
            if (!saved.has(property)) saved.set(property, element.style.getPropertyValue(property));
            originals.set(element, saved);
            element.style.setProperty(property, value);
        };
        const tone = (element: HTMLElement) => {
            if (originals.has(element)) return;
            const style = getComputedStyle(element);
            set(element, 'background-color', toneGround(style.backgroundColor));
            set(element, 'color', toneLine(style.color, PRIMARY_TEXT_LIGHTNESS));
            for (const side of BORDER_SIDES) {
                if (parseFloat(style.getPropertyValue(`border-${side}-width`)) === 0) continue;
                const edge = FIELD_TAGS.has(element.tagName)
                    ? FIELD_EDGE
                    : toneLine(style.getPropertyValue(`border-${side}-color`), Infinity);
                set(element, `border-${side}-color`, edge);
            }
        };
        const toneTree = (element: HTMLElement) => {
            tone(element);
            element.querySelectorAll<HTMLElement>('*').forEach(tone);
        };

        toneTree(root);
        // Only new nodes and class changes: the style writes above would otherwise feed the observer back.
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) tone(mutation.target);
                mutation.addedNodes.forEach(node => node instanceof HTMLElement && toneTree(node));
            }
        });
        observer.observe(root, { attributeFilter: ['class'], attributes: true, childList: true, subtree: true });

        return () => {
            observer.disconnect();
            originals.forEach((saved, element) => {
                saved.forEach((value, property) => {
                    if (value) element.style.setProperty(property, value);
                    else element.style.removeProperty(property);
                });
            });
        };
    }, [ref, active]);
}

function toneGround(color: string): string | undefined {
    const parsed = parseNeutral(color);
    if (!parsed) return undefined;
    return toned((parsed.lightness * TONED_LIGHTNESS) / CARD_GROUND_LIGHTNESS, parsed.alpha);
}

// Text and borders keep their lightness and only change hue; anything at or above `maxLightness` is left alone.
function toneLine(color: string, maxLightness: number): string | undefined {
    const parsed = parseNeutral(color);
    if (!parsed || parsed.lightness >= maxLightness) return undefined;
    return toned(parsed.lightness, parsed.alpha);
}

function toned(lightness: number, alpha: number): string {
    return `oklch(${lightness.toFixed(4)} ${TONE_CHROMA} ${TONE_HUE} / ${alpha})`;
}

function parseNeutral(color: string): { lightness: number; alpha: number } | undefined {
    const parsed = parseColor(color);
    if (!parsed || parsed.alpha === 0) return undefined;
    const [lightness, chroma] = parsed.oklch;
    return chroma > NEUTRAL_CHROMA ? undefined : { alpha: parsed.alpha, lightness };
}

// Computed colours come back as `rgb()` / `rgba()`, or as `oklch()` for the design system's OKLCH tokens.
function parseColor(color: string): { oklch: [number, number]; alpha: number } | undefined {
    const open = color.indexOf('(');
    if (open < 0 || !color.endsWith(')')) return undefined;
    const name = color.slice(0, open);
    const parts = color
        .slice(open + 1, -1)
        .replaceAll(',', ' ')
        .replaceAll('/', ' ')
        .split(' ')
        .filter(Boolean);
    if (name === 'oklch' && parts.length >= 3) {
        return { alpha: parseAlpha(parts[3]), oklch: [parseShare(parts[0]), Number(parts[1])] };
    }
    if ((name === 'rgb' || name === 'rgba') && parts.length >= 3) {
        const [red, green, blue] = parts.slice(0, 3).map(Number);
        return { alpha: parseAlpha(parts[3]), oklch: srgbToOklch(red, green, blue) };
    }
    return undefined;
}

function parseAlpha(value: string | undefined): number {
    return value === undefined ? 1 : parseShare(value);
}

// `0.5` or `50%`.
function parseShare(value: string): number {
    return value.endsWith('%') ? Number(value.slice(0, -1)) / 100 : Number(value);
}

// OKLab from sRGB (Björn Ottosson's matrices); only lightness and chroma are needed.
function srgbToOklch(red: number, green: number, blue: number): [number, number] {
    const [r, g, b] = [red, green, blue].map(channel => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bLab = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [lightness, Math.hypot(a, bLab)];
}
