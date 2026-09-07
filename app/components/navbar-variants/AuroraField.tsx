'use client';

import { cn } from '@components/shared/utils';
import React, { useCallback } from 'react';

import { BRAND_RGB, FRAGMENT_PRELUDE, type ShaderFrame, useShaderCanvas } from './use-shader-canvas';

/**
 * The aurora under the focused search field, as a shader on a small canvas.
 *
 * Ported from the reference pen ("[Three.js] Aurora ribbons", codepen.io/fmlghtpq-the-scripter/pen/qEazpwb),
 * which draws noise-warped tube ribbons in a Three.js scene with additive blending, UnrealBloom and a
 * starfield. None of the scene carries over — no geometry, no camera, no post-processing, and no Three.js
 * (a ~600KB dependency for a navbar's focus state is not a trade worth making). What carries over is the
 * fragment shader, which is where the aurora actually lives, kept close to the original:
 *
 * - two octaves of drifting simplex noise at different scales and speeds, plus a third for the top edge,
 *   so the light flows and never repeats;
 * - the same vertical profile — `bottomFill = smoothstep(0.6, 1, grad)` piling brightness onto the bottom,
 *   `fadeTop` easing it in from above through the third noise field, which is what ragged-edges the crown;
 * - the same `(noise + bottomFill)` gain shape, which is what gathers the light at the foot of the band.
 *
 * One thing the pen does not need and this does: a gate. Noise that only *scales* brightness leaves the
 * foot of the band lit from end to end, and a strip that is lit everywhere is an inner shadow, whatever
 * is rippling inside it. Thresholding the same noise field takes the alpha to nothing wherever it falls
 * below the gate, so the band breaks into separate lights with real gaps between them, and the gaps drift
 * along with everything else.
 *
 * The palette is not the pen's. Its rainbow sweeps hue with height, which is the look of a real aurora and
 * the look of nothing else in this app; the light here is the brand green, and what the noise varies is
 * its strength rather than its hue.
 *
 * Nor does the field travel as a whole. The pen animates by adding time to the sample coordinate, which
 * is a translation: sampling at `x + vt` shows whatever stood at `x + vt` now standing at `x`, so the
 * entire pattern slides, leftwards for a positive speed. In a sky that is the point; in a strip under a
 * search field it reads as a conveyor belt. Here time is the noise's *second axis*, so the lights
 * brighten and fade where they stand, and a slow warp field — low frequency in space, slower still in
 * time — nudges the sample position by an amount that differs from one part of the band to the next and
 * reverses as it evolves. Neighbouring lights therefore lean in different directions and each turns
 * around in its own time, which is the movement an aurora has and a conveyor belt does not.
 *
 * The differences are the ones the geometry used to handle. `grad` runs off the field's bottom edge rather
 * than around a tube's cross-section, and the canvas hangs below that edge by `overhang` so the CSS bloom
 * blur has material either side of the clip — a band that stops at the line loses half of what it spread
 * and reads as sawn off. Bloom is a blur on the element plus a canvas rendered at a fraction of its
 * display size, so the upscale is itself a soft filter.
 *
 * Along the field the band runs the whole width and peaks where the text starts, not at the left edge:
 * that is where the caret sits and where the eye already is. The peak is measured off the input's own box
 * rather than assumed, so it follows the field's padding and its lens instead of a number that would go
 * stale the moment either changed.
 *
 * The weighting around that peak is gentle — a fifth down at the field's left corner, a third down at the
 * far end. It has to be: the band is only a few pixels of real brightness at its foot, so a curve that
 * drops to a seventh of the peak, as an eye-catching one would, puts most of the field under the
 * threshold where any of it reads as light at all, and the glow appears to stop a sixth of the way in.
 *
 * The band fades in when the field takes focus and fades out four times as slowly when it loses it —
 * light that snaps on is a state change, light that rises is a response. The two durations are one
 * declaration each, on the resting and the focused rule respectively: a transition is read off the state
 * being moved *to*, so the resting rule's duration is what governs the way out.
 *
 * The loop runs while the field has focus and keeps running through the fade-out, since a frozen frame
 * dissolving is not the same thing as a light going out. It does not run at all under
 * `prefers-reduced-motion` — that gets a single frame, so the glow is still there, just still.
 *
 * The canvas sits behind the field's own content, so a shader that ever misbehaves cannot take the
 * placeholder with it, and the context is never deliberately lost on cleanup: `getContext` hands back the
 * *same* context object for a given canvas, so losing it on unmount would leave React's second mount in
 * development holding a dead one and drawing nothing.
 */

const FRAGMENT_SHADER = `${FRAGMENT_PRELUDE}
uniform float uTime;
uniform float uBand;
uniform float uOverhang;
uniform float uHeight;
uniform float uWidth;
uniform float uPeak;
uniform float uDensity;
uniform float uEdge;
uniform float uIntensity;

void main() {
    // Height above the field's edge, 0 at the edge (and anywhere below it) and 1 at the top of the band.
    // A guarded divisor rather than trust: a zero uniform would make this 0/0, and a NaN reaching
    // gl_FragColor comes out of most drivers as opaque white.
    float above = clamp((vUv.y * uHeight - uOverhang) / max(uBand, 1.0), 0.0, 1.0);
    float grad = 1.0 - above;

    // A strip, not a ring, so the noise is sampled on plain coordinates; the pen's polar trick exists only
    // to keep a closed tube seamless.
    float sx = vUv.x * uDensity;

    // Which way this stretch of the band is leaning, and how far. Low frequency in space so a lean covers
    // several lights, slow in time so it takes the better part of a minute to turn around.
    // Off the raw coordinate and not off the scaled one, so a change of density narrows the lights
    // without also shrinking the stretch of bar that one lean covers.
    float warp = snoise(vec2(vUv.x * 1.65, uTime * 0.024)) * 1.1;
    float wx = sx + warp;

    // Position on one axis, time on the other; the constants keep the three fields from being the same
    // field read at three magnifications, and the shear by height stops a light standing as a column.
    float noise = 0.5 + 0.5 * (
        0.5 * snoise(vec2(wx * 3.4 + above * 0.5, uTime * 0.14)) +
        0.5 * snoise(vec2(wx * 2.0 + above * 0.3 + 19.3, uTime * 0.1))
    );
    float noise1 = 0.5 + 0.5 * snoise(vec2(wx * 2.6 + 47.1, uTime * 0.12));

    // Across the width, peaking where the text begins.
    float x = vUv.x * uWidth;
    float shoulder = mix(0.8, 1.0, smoothstep(0.0, 1.0, clamp(x / max(uPeak, 1.0), 0.0, 1.0)));
    float decay = mix(1.0, 0.62, pow(clamp((x - uPeak) / max(uWidth - uPeak, 1.0), 0.0, 1.0), 0.75));
    // The same curve as a nearness, 1 at the caret and 0 at the tail, since that pair bottoms out at
    // about half rather than at zero.
    float nearPeak = clamp((shoulder * decay - 0.5) * 2.0, 0.0, 1.0);

    // Separate lights, not one lit strip: below the gate there is nothing at all. The window follows
    // the nearness above, so it opens wide where the text begins — most of the noise gets through and the lights
    // crowd together — and closes towards the tail, where only the strongest peaks make it and the band
    // thins to the occasional one. Density, not just brightness, is what makes the caret the place the
    // light comes from.
    float gate = smoothstep(mix(0.60, 0.34, nearPeak), mix(0.90, 0.68, nearPeak), noise);

    float bottomFill = smoothstep(0.6, 1.0, grad);
    // The pen's ragged crown, eased in from above through its own noise field.
    float crown = smoothstep(0.0, 0.55, grad - 0.28 * noise1);
    // The pen leans on an intensity of 0.009, dozens of overlapping ribbons and a bloom pass to get its
    // falloff; one quad has none of that, so the weighting towards the foot has to be explicit or the
    // band comes out as a slab of even alpha across the whole field.
    float foot = pow(grad, 2.6);
    // A hot line in the last few pixels: half again the strength right on the border, back to the
    // ordinary profile within about a tenth of the band's height. The overhang below the clip keeps the
    // blur from eating half of it.
    float edge = 1.0 + uEdge * smoothstep(0.88, 1.0, grad);

    // The brand green (#1dd79b), the same one the connected cluster and the accent buttons carry. Gain
    // kept under the white ceiling: the pen clips to white on purpose and lets bloom carry it, and here
    // that would just wash the placeholder out.
    vec3 brand = ${BRAND_RGB};
    vec3 color = brand * (0.34 + 0.44 * noise + 0.3 * bottomFill);

    float alpha = clamp(foot * edge * crown * gate * shoulder * decay * 0.195 * uIntensity, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
}
`;

const UNIFORMS = [
    'uTime',
    'uBand',
    'uOverhang',
    'uHeight',
    'uWidth',
    'uPeak',
    'uDensity',
    'uEdge',
    'uIntensity',
] as const;

/**
 * What a bar may vary about its own aurora. The defaults are the band as first tuned; a variant that wants
 * finer light says so rather than the two of them sharing one set of constants and one look.
 */
export interface AuroraFieldTuning {
    /** Bloom radius in px. Narrow streaks need less of it or they smear away. */
    blur?: number;
    /** Cells across the field: higher is narrower, more numerous lights. */
    density?: number;
    /** How much brighter the last few pixels are than the rest of the profile. */
    edgeBoost?: number;
    /** Scales the whole band, the hot edge with it, so the balance within it is kept. */
    intensity?: number;
}

export interface AuroraFieldProps extends AuroraFieldTuning {
    /** Runs the loop. The glow is only on screen while the field has focus, so it idles otherwise. */
    active: boolean;
    /** Visible height above the field's bottom edge, in px. */
    band: number;
    className?: string;
    /** How far the canvas hangs below that edge, in px, so the bloom blur is not clipped mid-spread. */
    overhang: number;
}

export function AuroraField({
    active,
    band,
    blur = 3,
    className,
    density = 6.6,
    edgeBoost = 0.5,
    intensity = 1,
    overhang,
}: AuroraFieldProps) {
    // Where the text starts, in the canvas's own coordinates. Read off the input rather than assumed, and
    // only when the canvas changes size: it is a layout read, and the caret cannot move while the width
    // holds. `useRef` and not state — nothing renders on it.
    const peak = React.useRef(40);

    const setUniforms = useCallback(
        (set: (name: string, value: number) => void, frame: ShaderFrame) => {
            if (frame.resized) {
                const input = frame.canvas.parentElement?.querySelector('input');
                peak.current = input
                    ? Math.max(0, input.getBoundingClientRect().left - frame.canvas.getBoundingClientRect().left)
                    : 40;
            }
            set('uTime', frame.seconds);
            set('uBand', band);
            set('uOverhang', overhang);
            set('uHeight', band + overhang);
            set('uWidth', frame.width);
            set('uPeak', peak.current);
            set('uDensity', density);
            set('uEdge', edgeBoost);
            set('uIntensity', intensity);
        },
        [band, density, edgeBoost, intensity, overhang],
    );

    const canvasRef = useShaderCanvas({ active, fragment: FRAGMENT_SHADER, setUniforms, uniformNames: UNIFORMS });

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-x-0 block',
                'opacity-0 transition-opacity ease-out [transition-duration:1200ms]',
                'group-focus-within/frame:opacity-100 group-focus-within/frame:duration-300',
                className,
            )}
            style={{
                bottom: -overhang,
                // The pen's bloom, cheaply: this spreads the bright foot of the band the way the
                // post-processing pass did.
                filter: `blur(${blur}px)`,
                height: band + overhang,
                // Explicit, and not left to `inset-x-0`: see the note on pinning in `useShaderCanvas`.
                width: '100%',
                // Behind the field's own content. The frame is a positioned, z-indexed box and therefore a
                // stacking context, so this goes under the text without falling behind the frame's ground.
                zIndex: -1,
            }}
        />
    );
}
