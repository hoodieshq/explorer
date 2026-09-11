'use client';

/**
 * Live knobs for the v3 CTA dot field, with the reasoning behind each default.
 *
 * A prototype control, like the version switcher that hosts its sliders: the values live in one
 * mutable object that the field's rAF loop re-reads every frame, so dragging a slider retunes the
 * dots on the spot — no remount, no React state per frame, nothing to reload. The loop owns the
 * mechanism (`GravityCta` in `McpDocsOverviewViewV3`); this module owns the numbers.
 *
 * Values come in scopes: the page-wide set below, and named scopes that override it for one band on
 * one class of screen (see CTA_FIELD_SCOPES). A band may still override `flight`, `falloff` or
 * `softening` through its own props, and those win over both.
 */
export type CtaFieldTuning = {
    /** Dot budget, as a factor on the standard one — the resting field and the swarm alike. */
    density: number;
    /**
     * Ambient fluctuation (px/s²): the slow per-dot sway that is all that is left once the pull
     * stops. Its own OU process, so it can be tuned without touching how directed motion halts.
     * (Was 368 before it became a slider; rounded to the step so the thumb and the readout agree.)
     */
    drift: number;
    /**
     * How steeply the pull falls off with distance. 2 is textbook inverse-square: nearly all of the
     * pull sits in the last few dozen px, so the field barely reaches and the dots then whip into
     * the button. Lower spreads the same pull out — further reach, calmer arrival.
     */
    falloff: number;
    /**
     * How fast the dots fly in, as a factor on the tuned 1×. Arrival speed goes as the square root
     * of the attraction, so the pull is scaled by the square of this and 0.5 really is half the
     * speed. This sits on top of the scaling that already matches each band's pull to its own size.
     */
    flight: number;
    /**
     * Terminal speed (px/s): 30px between frames at 60Hz. Deliberately absolute, not
     * field-relative — it is a limit of the screen, not of the physics: a 1-2px dot that jumps
     * further than this between frames stops reading as one dot in flight and starts reading as a
     * flash somewhere else.
     *
     * Free fall keeps accelerating to the last frame, and the pull that carries a dot the width of
     * the hero band was landing it at 100px a frame (160px on a wide desktop), which is what made
     * that band flicker while the shorter closing one read as clean flight. The cap holds the last
     * stretch — the closing 200px or so, a tenth of the flight — at a steady speed instead: the
     * arrival is calmer in every band, the drift in is untouched, and flight time grows by about
     * 30ms. A phone's dots top out around 20px a frame on their own and never reach it.
     */
    maxSpeed: number;
    /**
     * While the pull is on, both the dot cap and the spawn rate are multiplied by this, so a hover
     * pulls in a swarm this many times denser than the resting field. Off-hover the cap drops back
     * and the excess fades away over the next second.
     */
    pullDensity: number;
    /**
     * Softening length (px): the pull is measured against sqrt(d² + s²) rather than d, so it levels
     * off instead of blowing up as a dot closes in. A larger value is a wider, gentler landing.
     * Quoted for the reference field and scaled with each band, so it keeps its share of the field.
     */
    softening: number;
    /** Fresh dots per second at rest, before the pull's multiplier. */
    spawn: number;
};

export const CTA_FIELD_TUNING_DEFAULTS: CtaFieldTuning = {
    density: 1,
    drift: 360,
    falloff: 2,
    flight: 1,
    maxSpeed: 1800,
    pullDensity: 5,
    softening: 24,
    spawn: 1100,
};

/** One slider: the range it spans and how its value is read back. */
export type CtaFieldTuningControl = {
    format: (value: number) => string;
    hint: string;
    key: keyof CtaFieldTuning;
    label: string;
    max: number;
    min: number;
    step: number;
};

const times = (value: number) => `${value.toFixed(2)}×`;

export const CTA_FIELD_TUNING_CONTROLS: CtaFieldTuningControl[] = [
    {
        format: times,
        hint: 'Pull strength as a speed factor: 0.5 is half the flight speed.',
        key: 'flight',
        label: 'Flight',
        max: 3,
        min: 0.1,
        step: 0.05,
    },
    {
        format: value => `${Math.round(value)} · ${Math.round(value / 60)}px/f`,
        hint: 'Terminal speed. Past ~40px a frame the dots read as flicker rather than flight.',
        key: 'maxSpeed',
        label: 'Top speed',
        max: 7200,
        min: 300,
        step: 60,
    },
    {
        format: value => value.toFixed(2),
        hint: 'Falloff exponent. Below 2 the field reaches further and eases off near the button.',
        key: 'falloff',
        label: 'Falloff',
        max: 2.6,
        min: 1.2,
        step: 0.05,
    },
    {
        format: value => `${Math.round(value)}px`,
        hint: 'Flat spot around the button — how early the arriving dots stop accelerating.',
        key: 'softening',
        label: 'Softening',
        max: 120,
        min: 4,
        step: 2,
    },
    {
        format: times,
        hint: 'Dot budget at rest, on top of each band’s own share.',
        key: 'density',
        label: 'Density',
        max: 3,
        min: 0.1,
        step: 0.05,
    },
    {
        format: value => `${value.toFixed(1)}×`,
        hint: 'How much denser the field gets while the pull is on.',
        key: 'pullDensity',
        label: 'Pull swarm',
        max: 12,
        min: 1,
        step: 0.5,
    },
    {
        format: value => `${Math.round(value)}/s`,
        hint: 'Fresh dots per second at rest.',
        key: 'spawn',
        label: 'Spawn',
        max: 3000,
        min: 100,
        step: 50,
    },
    {
        format: value => String(Math.round(value)),
        hint: 'Ambient sway once the pull is off.',
        key: 'drift',
        label: 'Drift',
        max: 1200,
        min: 0,
        step: 20,
    },
];

/**
 * Where a set of values applies. `base` is the page: it drives both bands on a phone and the
 * closing band everywhere, and it is what the defaults above describe. A named scope is a band on a
 * class of screen that wants its own reading of the field, and it overrides the base there.
 *
 * "Desktop" here means "not the phone field" — the same `(hover: none), (max-width: 767px)` test the
 * dot budget uses, so a tablet with a pointer counts as desktop and an iPad does not.
 */
export const CTA_FIELD_SCOPES = [
    { caption: 'Phones, and any band with no set of its own.', key: 'base', label: 'Page' },
    { caption: 'Top band, on pointer screens wider than 767px.', key: 'heroDesktop', label: 'Top' },
    { caption: 'Closing band, on those same screens.', key: 'closingDesktop', label: 'Bottom' },
] as const;

export type CtaFieldScope = (typeof CTA_FIELD_SCOPES)[number]['key'];

/**
 * Tuned on the page, on a 1440 desktop: a sparse field easing in at no more than 6px a frame, which
 * makes the band read as a slow drift across the screen rather than a fall into the button. The
 * flight takes 2.7s from the middle of the band and 5.3s from the far corner, against 1.0s and 2.5s
 * on the page values. The field holds 520 dots at rest against the page's 2600 and spawns at a
 * little over half the rate, but gathers 3.5× of that while the pull is on, so the band is nearly
 * bare at rest and fills up under the pointer.
 */
export const CTA_FIELD_SCOPE_DEFAULTS: Record<Exclude<CtaFieldScope, 'base'>, CtaFieldTuning> = {
    /**
     * Tuned on the page beside the hero's set: the same half-speed pull, but the band keeps the
     * textbook inverse-square curve and its full spread of dots, and its ceiling sits at 16px a
     * frame rather than 6. So the closing band still reads as a fall into the button — 1.8s from
     * the middle of it — where the hero reads as a slow drift across the screen.
     */
    closingDesktop: {
        density: 1,
        drift: 360,
        falloff: 2,
        flight: 0.55,
        maxSpeed: 960,
        pullDensity: 2.5,
        softening: 24,
        spawn: 1100,
    },
    heroDesktop: {
        density: 0.2,
        drift: 320,
        falloff: 1.3,
        flight: 0.3,
        maxSpeed: 360,
        pullDensity: 3.5,
        softening: 24,
        spawn: 600,
    },
};

const STORAGE_KEY = 'mcp-docs:cta-field-scopes';

const clamp = (key: keyof CtaFieldTuning, value: number) => {
    const control = CTA_FIELD_TUNING_CONTROLS.find(entry => entry.key === key);
    if (!control || !Number.isFinite(value)) return CTA_FIELD_TUNING_DEFAULTS[key];
    return Math.min(control.max, Math.max(control.min, value));
};

const blank = () =>
    Object.fromEntries(
        (Object.keys(CTA_FIELD_SCOPE_DEFAULTS) as Exclude<CtaFieldScope, 'base'>[]).map(scope => [
            scope,
            { ...CTA_FIELD_SCOPE_DEFAULTS[scope] },
        ]),
    ) as Record<Exclude<CtaFieldScope, 'base'>, CtaFieldTuning>;

/**
 * The live values, read straight out of the field loop every frame. Mutated in place rather than
 * replaced, so the loop never has to re-subscribe to anything.
 */
export const ctaFieldTuning: CtaFieldTuning = { ...CTA_FIELD_TUNING_DEFAULTS };
export const ctaFieldScopes = blank();

/** The values in force for a scope: its own, falling back to the page. */
export function resolveCtaField(scope: CtaFieldScope): CtaFieldTuning {
    return scope === 'base' ? ctaFieldTuning : { ...ctaFieldTuning, ...ctaFieldScopes[scope] };
}

const valuesOf = (scope: CtaFieldScope) => (scope === 'base' ? ctaFieldTuning : ctaFieldScopes[scope]);

// Bumped on every write. React subscribes to this rather than to the objects above, which keep
// their references for the loop's sake.
let revision = 0;
const listeners = new Set<() => void>();

function persist() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ base: ctaFieldTuning, scopes: ctaFieldScopes }));
    } catch {
        // A private window or blocked storage: the tuning just doesn't outlive the session.
    }
}

function announce() {
    revision++;
    for (const listener of listeners) listener();
}

function absorb(target: CtaFieldTuning, source: unknown) {
    if (!source || typeof source !== 'object') return;
    for (const key of Object.keys(CTA_FIELD_TUNING_DEFAULTS) as (keyof CtaFieldTuning)[]) {
        const value = (source as Record<string, unknown>)[key];
        if (typeof value === 'number') target[key] = clamp(key, value);
    }
}

/** Restore whatever the last session left, clamped to the sliders' own ranges. */
export function loadCtaFieldTuning() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as { base?: unknown; scopes?: Record<string, unknown> };
        absorb(ctaFieldTuning, parsed.base);
        for (const scope of Object.keys(ctaFieldScopes) as Exclude<CtaFieldScope, 'base'>[]) {
            absorb(ctaFieldScopes[scope], parsed.scopes?.[scope]);
        }
        announce();
    } catch {
        // Unreadable or stale shape — the defaults stand.
    }
}

export function setCtaFieldValue(scope: CtaFieldScope, key: keyof CtaFieldTuning, value: number) {
    valuesOf(scope)[key] = clamp(key, value);
    persist();
    announce();
}

/** Back to the values this scope ships with — the defaults above, not the page's. */
export function resetCtaFieldScope(scope: CtaFieldScope) {
    Object.assign(valuesOf(scope), scope === 'base' ? CTA_FIELD_TUNING_DEFAULTS : CTA_FIELD_SCOPE_DEFAULTS[scope]);
    persist();
    announce();
}

export function subscribeCtaFieldTuning(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getCtaFieldTuningRevision() {
    return revision;
}
