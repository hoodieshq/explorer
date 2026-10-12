import { useSyncExternalStore } from 'react';
import { array, is, number, object, size } from 'superstruct';

// REVIEW(HOO-1815): the easing editor's values for the morph, so the team can tune it live from the design menu.
// Remove before the external PR: bake the chosen values into feedback-sent-motion.ts (the editor's Copy gives them).

export type CubicBezier = [number, number, number, number];

export interface MorphSegment {
    ms: number;
    easing: CubicBezier;
}

/** fold: the popup into the toast's box. hit: into the squash. rebound: past the rest. settle: into the rest. */
export type MorphSegmentId = 'fold' | 'hit' | 'rebound' | 'settle';

export type MorphTuning = Record<MorphSegmentId, MorphSegment>;

export const MORPH_TUNING_DEFAULTS: MorphTuning = {
    // Ease-in: still speeding up when it hits the ceiling.
    fold: { easing: [0.5, 0, 1, 0.6], ms: 300 },
    hit: { easing: [0.2, 0.7, 0.4, 1], ms: 280 },
    rebound: { easing: [0.45, 0, 0.4, 1], ms: 520 },
    settle: { easing: [0.3, 0, 0.3, 1], ms: 680 },
};

export function getMorphTuning(): MorphTuning {
    return readTuning();
}

export function useMorphTuning(): MorphTuning {
    return useSyncExternalStore(subscribe, readTuning, () => MORPH_TUNING_DEFAULTS);
}

export function setMorphSegment(id: MorphSegmentId, segment: MorphSegment) {
    write({ ...readTuning(), [id]: segment });
}

export function resetMorphTuning() {
    write(MORPH_TUNING_DEFAULTS);
}

export function cubicBezierCss([x1, y1, x2, y2]: CubicBezier): string {
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

const STORAGE_KEY = 'hoo-1815:morph-tuning';
const SegmentStruct = object({ easing: size(array(number()), 4), ms: number() });
const TuningStruct = object({ fold: SegmentStruct, hit: SegmentStruct, rebound: SegmentStruct, settle: SegmentStruct });
let tuning: MorphTuning | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function readTuning(): MorphTuning {
    if (tuning === undefined) {
        try {
            const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
            // Hand-edited or from an older shape: the defaults instead.
            tuning = is(stored, TuningStruct) ? (stored as MorphTuning) : MORPH_TUNING_DEFAULTS;
        } catch {
            tuning = MORPH_TUNING_DEFAULTS;
        }
    }
    return tuning;
}

function write(next: MorphTuning) {
    tuning = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage can be blocked; the values still hold for this page view.
    }
    listeners.forEach(listener => listener());
}
