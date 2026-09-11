'use client';

import { cn } from '@components/shared/utils';
import { ClusterStatus } from '@utils/cluster';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import React from 'react';
import { Loader, Shield, ShieldOff, Wifi, WifiOff } from 'react-feather';

/**
 * Three ways of drawing "is there a connection", switchable from the variant plate, because the glyph is
 * as much of a design decision as the layout around it and reads differently at 10px than it does in a
 * sketch. Colour is never the glyph's own: every one of them draws in `currentColor`, so the caption's
 * palette stays the caption's business.
 *
 * A set answers both of the caption's questions, since the two marks stand side by side and have to look
 * like they came from one hand. The first three keep the shield pair for provenance; the fourth swaps it
 * for a stamp, which is the older idiom for the same claim — this endpoint has been vouched for — and
 * puts the cross where the far machine stood, wired to it, so the link plainly ends badly rather than
 * merely stopping.
 */

export type IconSetId = 'set1' | 'set2' | 'set3' | 'set4';

export interface ConnectionGlyphProps {
    className?: string;
    /** Height in px. The wide set is twice this across; the others are square. */
    size: number;
}

export const ICON_SET_IDS: readonly IconSetId[] = ['set1', 'set2', 'set3', 'set4'];

/** Shared with the plate's own labels. */
export const ICON_SET_LABELS: Record<IconSetId, string> = {
    set1: 'Signal fan',
    set2: 'Signal bars',
    set3: 'Two machines',
    set4: 'Stamp and cross',
};

const STORAGE_KEY = 'explorer:navIconSet';

/** The one the review settled on; an unknown stored value falls back to it. */
const DEFAULT_ICON_SET: IconSetId = 'set4';

function parseIconSet(value: unknown): IconSetId {
    // A loop rather than `includes`, which returns a boolean and narrows nothing, and rather than an
    // assertion, which this repo does not allow: the loop variable already has the type.
    for (const id of ICON_SET_IDS) if (value === id) return id;
    return DEFAULT_ICON_SET;
}

/**
 * Validated on read, like the variant id: a value written by an earlier build can name a set this one no
 * longer has, and an unknown id would otherwise index to `undefined` and take the caption's glyph with it.
 */
export const iconSetAtom = (() => {
    const { getItem, setItem, removeItem, subscribe } = createJSONStorage<IconSetId>(() => localStorage);
    const validated = {
        getItem: (key: string, initial: IconSetId) => parseIconSet(getItem(key, initial)),
        removeItem,
        setItem,
        subscribe:
            subscribe &&
            ((key: string, callback: (value: IconSetId) => void, initial: IconSetId) =>
                subscribe(key, v => callback(parseIconSet(v)), initial)),
    };
    return atomWithStorage<IconSetId>(STORAGE_KEY, DEFAULT_ICON_SET, validated);
})();

/**
 * One stroke weight for every glyph in the caption, given per glyph's own box: the connection glyphs are
 * drawn on a 16-unit-tall viewBox and the rest on 24, so the *same* apparent weight needs a different
 * number in each — the pair below is 0.0875 of the glyph's height either way, and the two have to be
 * changed together. The provenance mark sat at 1.5–2 on its 24-unit box — about two thirds of the
 * connection glyph's line — and beside it read as the lighter, lesser of the two facts, which they are
 * not.
 *
 * Feather's own icons are drawn on 24 and take the weight as a prop, so they are held to the same number
 * rather than to their 2.0 default.
 */
const STROKE_ON_16 = 1.4;
const STROKE_ON_24 = 2.1;

/**
 * Set 2 — the ladder of bars a router or a phone prints for signal strength. Read as strength rather than
 * as a yes/no, which is the point of offering it: it says the same thing in the vocabulary of hardware.
 */
function Bars({ className, size, state }: ConnectionGlyphProps & { state: 'off' | 'on' | 'weak' }) {
    const heights = [16, 13, 9.5, 6];
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_ON_24}
            strokeLinecap="round"
            className={className}
            aria-hidden
        >
            {heights.map((y, index) => (
                <line
                    key={y}
                    x1={4 + index * 5.4}
                    x2={4 + index * 5.4}
                    y1={20}
                    y2={y}
                    opacity={state === 'on' || index < (state === 'weak' ? 2 : 4) ? 1 : 0.3}
                />
            ))}
            {state === 'off' && <line x1={3} y1={21} x2={21} y2={3} />}
        </svg>
    );
}

/**
 * Set 3 — two machines and the wire between them, whole or broken, which is how desktop operating systems
 * drew a network for twenty years. Twice as wide as it is tall, so it needs its own viewBox and its own
 * width; the caption is a flex row and takes that without complaint.
 */
function Wire({
    className,
    low,
    padded,
    size,
    state,
}: ConnectionGlyphProps & { low?: boolean; padded?: boolean; state: 'broken' | 'broken-near' | 'trying' | 'whole' }) {
    // Two rendered pixels of clearance at each end, expressed in the viewBox's own units: the glyph is
    // 16 units tall and `size` px, so a unit is `size / 16` px and two pixels are `32 / size` units. Given
    // to the box rather than taken out of the drawing, so the machines keep the size they had.
    const pad = padded ? 32 / size : 0;
    // Where the wire runs. Set 4 drops it to the machines' feet and pulls it in at both ends, so it reads
    // as a cable between two desks rather than a rule ruled through the middle of them.
    const wireY = low ? 9 : 6;
    // Two units of air taken off each end of the wire, so it reads as a run of cable between two machines
    // rather than as a bar wedged against them. Units of the 32×16 box: at the 11px this is drawn at,
    // that is a little over a pixel a side on screen.
    const WIRE_TRIM = 2;
    const wireFrom = (low ? 11.5 : 10.5) + WIRE_TRIM;
    const wireTo = (low ? 20.5 : 21.5) - WIRE_TRIM;
    const machine = (x: number) => (
        <>
            <rect x={x} y={2.5} width={9} height={7} rx={1} />
            <line x1={x + 4.5} y1={9.5} x2={x + 4.5} y2={12} />
            <line x1={x + 1.5} y1={13} x2={x + 7.5} y2={13} />
        </>
    );
    return (
        <svg
            width={(size * (32 + pad * 2)) / 16}
            height={size}
            viewBox={`${-pad} 0 ${32 + pad * 2} 16`}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_ON_16}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {machine(1)}
            {/* The far machine is there while there is something to reach; when there is not, the cross
                stands where it stood, and the wire runs up to the cross instead of to it. A gap with a
                mark floating in it says less than a link that plainly ends badly. */}
            {state === 'broken-near' ? (
                // The cross takes the whole of the machine's footprint, base and all, so it reads as
                // standing in for it rather than as a mark dropped beside it.
                <>
                    <line x1={22} y1={2.5} x2={31} y2={13} />
                    <line x1={31} y1={2.5} x2={22} y2={13} />
                </>
            ) : (
                machine(22)
            )}
            {state === 'whole' && <line x1={wireFrom} y1={wireY} x2={wireTo} y2={wireY} />}
            {state === 'trying' && <line x1={wireFrom} y1={wireY} x2={wireTo} y2={wireY} strokeDasharray="2 2" />}
            {/* The cross stands *in place of* the wire, not across it: struck through, the two read as one
                smudge at this size. Where it stands is what separates the two sets that use this — in the
                middle of the gap, or up against the machine whose link has gone. */}
            {state === 'broken' && (
                <>
                    <line x1={13.5} y1={3.5} x2={18.5} y2={8.5} />
                    <line x1={18.5} y1={3.5} x2={13.5} y2={8.5} />
                </>
            )}
            {state === 'broken-near' && <line x1={wireFrom} y1={wireY} x2={wireTo} y2={wireY} />}
        </svg>
    );
}

/**
 * A stamp's scalloped edge, built rather than drawn: each lobe is a semicircular arc on the chord between
 * two points of a circle, so the count can change without anyone re-drawing a path by hand.
 */
function scallopPath(centre: number, radius: number, lobes: number) {
    const step = (Math.PI * 2) / lobes;
    const bulge = radius * Math.sin(step / 2);
    const point = (index: number) => {
        const angle = index * step - Math.PI / 2;
        return `${(centre + radius * Math.cos(angle)).toFixed(2)} ${(centre + radius * Math.sin(angle)).toFixed(2)}`;
    };
    let path = `M ${point(0)}`;
    for (let index = 1; index <= lobes; index++)
        path += ` A ${bulge.toFixed(2)} ${bulge.toFixed(2)} 0 0 1 ${point(index)}`;
    return `${path} Z`;
}

const STAMP_EDGE = scallopPath(12, 8, 9);

/** Set 4's provenance: a stamp, struck through when nothing has vouched for the endpoint. */
function Stamp({ className, size, vouched }: ConnectionGlyphProps & { vouched: boolean }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {/* Edge and mark at one weight, the connection glyph's: they were 1.5 and 2, which put three
                different lines in a caption two glyphs wide. */}
            <path d={STAMP_EDGE} strokeWidth={STROKE_ON_24} />
            {vouched ? (
                <polyline points="8.4 12.2 11 14.7 15.8 9.3" strokeWidth={STROKE_ON_24} />
            ) : (
                <line x1={7.5} y1={16.5} x2={16.5} y2={7.5} strokeWidth={STROKE_ON_24} />
            )}
        </svg>
    );
}

type GlyphComponent = (props: ConnectionGlyphProps) => React.JSX.Element;

interface IconSet {
    connection: Record<ClusterStatus, GlyphComponent>;
    provenance: { known: GlyphComponent; unknown: GlyphComponent };
}

const SHIELDS: IconSet['provenance'] = {
    known: ({ className, size }) => <Shield size={size} strokeWidth={STROKE_ON_24} className={className} aria-hidden />,
    unknown: ({ className, size }) => (
        <ShieldOff size={size} strokeWidth={STROKE_ON_24} className={className} aria-hidden />
    ),
};

/** Set 1 — feather's own, the fan of waves and its struck-through twin. */
const SET_1: Record<ClusterStatus, GlyphComponent> = {
    [ClusterStatus.Connected]: ({ className, size }) => (
        <Wifi size={size} strokeWidth={STROKE_ON_24} className={className} aria-hidden />
    ),
    [ClusterStatus.Connecting]: ({ className, size }) => (
        <Loader size={size} strokeWidth={STROKE_ON_24} className={cn('animate-spin', className)} aria-hidden />
    ),
    [ClusterStatus.Failure]: ({ className, size }) => (
        <WifiOff size={size} strokeWidth={STROKE_ON_24} className={className} aria-hidden />
    ),
};

const SET_2: Record<ClusterStatus, GlyphComponent> = {
    [ClusterStatus.Connected]: props => <Bars {...props} state="on" />,
    [ClusterStatus.Connecting]: props => (
        <Bars {...props} className={cn('animate-pulse', props.className)} state="weak" />
    ),
    [ClusterStatus.Failure]: props => <Bars {...props} state="off" />,
};

const SET_3: Record<ClusterStatus, GlyphComponent> = {
    [ClusterStatus.Connected]: props => <Wire {...props} state="whole" />,
    [ClusterStatus.Connecting]: props => (
        <Wire {...props} className={cn('animate-pulse', props.className)} state="trying" />
    ),
    [ClusterStatus.Failure]: props => <Wire {...props} state="broken" />,
};

const SET_4: Record<ClusterStatus, GlyphComponent> = {
    [ClusterStatus.Connected]: props => <Wire {...props} low padded state="whole" />,
    [ClusterStatus.Connecting]: props => (
        <Wire {...props} low padded className={cn('animate-pulse', props.className)} state="trying" />
    ),
    [ClusterStatus.Failure]: props => <Wire {...props} low padded state="broken-near" />,
};

export const ICON_SETS: Record<IconSetId, IconSet> = {
    set1: { connection: SET_1, provenance: SHIELDS },
    set2: { connection: SET_2, provenance: SHIELDS },
    set3: { connection: SET_3, provenance: SHIELDS },
    set4: {
        connection: SET_4,
        provenance: {
            known: props => <Stamp {...props} vouched />,
            unknown: props => <Stamp {...props} vouched={false} />,
        },
    },
};
