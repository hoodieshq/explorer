'use client';

import { cn } from '@components/shared/utils';
import React, { type RefObject, useCallback } from 'react';

import { BRAND_RGB, FRAGMENT_PRELUDE, useShaderCanvas } from './use-shader-canvas';

/**
 * The aurora as one sheet of light standing *behind* the search frame, showing above and below it.
 *
 * Not a halo tracing the frame's outline: that lit all four sides, and the two long ones read as separate
 * effects that happened to share a colour — a light over the field and another under it, agreeing about
 * nothing. Here there is a single field of light, one coordinate along the bar driving all of it, so the
 * flare above the frame and the flare below it at the same point *are* the same flare, seen at both ends
 * of the thing covering its middle. The frame's own ground hides the middle, which is what makes it read
 * as one sheet rather than two edges.
 *
 * The short sides are dark on purpose. Light spilling past the ends of the field would have to belong to
 * something, and there is nothing there — the bar simply continues.
 *
 * It cannot live inside the frame: that box clips its overflow, which is what keeps the field's rounded
 * corners and its morph tidy. So the canvas is a sibling in the bar's row, and each frame it measures the
 * frame's box and places itself around it with `spill` px of clearance. Measuring per frame rather than on
 * resize is deliberate: below the docking width the frame animates open and shut, and a sheet that only
 * re-measured at the ends of that would swim behind it.
 *
 * `spill` is also what keeps the light inside the bar. The row sits in the navbar's own vertical padding,
 * so a spill matched to that padding reaches the bar's edges and no further, and the shader fades to
 * nothing over the last half of it rather than being cut off at the boundary.
 */

const FRAGMENT_SHADER = `${FRAGMENT_PRELUDE}
uniform float uTime;
uniform float uWidth;
uniform float uHeight;
uniform float uSpill;

void main() {
    vec2 size = vec2(uWidth, uHeight);
    vec2 p = vUv * size - size * 0.5;
    // The frame's own half-extent: the canvas less the clearance it was given on each side.
    vec2 halfSize = max(size * 0.5 - uSpill, vec2(1.0));

    // One coordinate along the bar, shared by everything above and below. A cell every 3.5px, so a
    // surviving light is a streak a few pixels across rather than a patch.
    float along = (p.x + halfSize.x) / 3.5;

    // The fast clock: where the lights are, sliding along the bar. The spatial term is a quarter of what
    // it was, since the coordinate is four times finer and a lean has to keep covering the same stretch
    // rather than a quarter of it.
    float drift = snoise(vec2(along * 0.04, uTime * 0.07)) * 1.8;
    float a = along + drift;

    // The slow clock: how strong they are. Brightness that changes faster than position reads as flicker
    // with a drift rather than as light going somewhere, which is why these are an order under the drift.
    float noise = 0.5 + 0.5 * (
        0.5 * snoise(vec2(a, uTime * 0.024)) +
        0.5 * snoise(vec2(a * 0.55 + 11.3, uTime * 0.017))
    );

    // Thinned hard: the window sits well above the middle of the noise's distribution, so most of the bar
    // is dark at any moment and what is lit stands apart. Tightened along with the finer cells, or four
    // times as many streaks would arrive with them.
    float gate = smoothstep(0.66, 0.92, noise);

    // How far this light throws past the frame, in px, tied to its strength: a strong one carries well
    // clear of the edge, a weak one barely shows. That is what makes a flare of what would be a band.
    float reach = 2.5 + 9.0 * noise;
    float body = exp(-max(abs(p.y) - halfSize.y, 0.0) / reach);

    // Gone before the canvas ends, so the bar's own edge never cuts a lit pixel.
    float withinBar = 1.0 - smoothstep(halfSize.y + uSpill * 0.45, halfSize.y + uSpill, abs(p.y));
    // Dark past the ends of the field: light out there would belong to nothing.
    float withinField = 1.0 - smoothstep(halfSize.x - 10.0, halfSize.x, abs(p.x));

    float amplitude = 0.2 + 1.2 * pow(noise, 1.6);
    vec3 color = ${BRAND_RGB} * (0.35 + 0.75 * noise);
    float alpha = clamp(body * withinBar * withinField * gate * amplitude * 0.7, 0.0, 1.0);
    // Premultiplied, as the canvas is composited — see the note in use-shader-canvas.ts.
    gl_FragColor = vec4(color * alpha, alpha);
}
`;

const UNIFORMS = ['uTime', 'uWidth', 'uHeight', 'uSpill'] as const;

export interface AuroraBehindProps {
    active: boolean;
    className?: string;
    /** Clearance around the frame, in px: how far the light has room to reach, and no further. */
    spill: number;
    /** The frame to stand behind. Its offset parent must be the box this canvas is positioned in. */
    targetRef: RefObject<HTMLElement | null>;
}

export function AuroraBehind({ active, className, spill, targetRef }: AuroraBehindProps) {
    const layout = useCallback(
        (canvas: HTMLCanvasElement) => {
            const target = targetRef.current;
            const row = canvas.offsetParent;
            if (!target || !(row instanceof HTMLElement)) return;
            const t = target.getBoundingClientRect();
            const r = row.getBoundingClientRect();
            canvas.style.left = `${Math.round(t.left - r.left) - spill}px`;
            canvas.style.top = `${Math.round(t.top - r.top) - spill}px`;
            canvas.style.width = `${Math.round(t.width) + spill * 2}px`;
            canvas.style.height = `${Math.round(t.height) + spill * 2}px`;
        },
        [spill, targetRef],
    );

    const setUniforms = useCallback(
        (set: (name: string, value: number) => void, frame: { height: number; seconds: number; width: number }) => {
            set('uTime', frame.seconds);
            set('uWidth', frame.width);
            set('uHeight', frame.height);
            set('uSpill', spill);
        },
        [spill],
    );

    const canvasRef = useShaderCanvas({
        active,
        fragment: FRAGMENT_SHADER,
        layout,
        setUniforms,
        uniformNames: UNIFORMS,
    });

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            // No `group-focus-within`: this is a sibling of the frame, not a descendant, so the state comes
            // down as a prop and the two durations ride on the class instead of on a variant.
            className={cn(
                'pointer-events-none absolute block transition-opacity ease-out',
                active ? 'opacity-100 duration-300' : 'opacity-0 [transition-duration:1200ms]',
                className,
            )}
            // The box is written by `layout` every frame; these are only what the first one starts from.
            // 2px, not 3: a streak a few pixels across is smeared away by much more than that.
            style={{ filter: 'blur(2px)', height: 1, left: 0, top: 0, width: 1 }}
        />
    );
}
