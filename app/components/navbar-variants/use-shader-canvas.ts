import 'client-only';

import { type RefObject, useEffect, useRef, useState } from 'react';

/**
 * The plumbing behind the navbar's shader-drawn glows: a canvas, one WebGL program over a full-screen
 * triangle, and a loop that runs only while the glow is on screen. Two of them share it — the aurora under
 * a search field and the halo around one — and neither has any business owning context creation.
 *
 * The caller owns the canvas's CSS size and its fragment shader; this owns everything between.
 *
 * Two things here are load-bearing and easy to undo by accident:
 *
 * - The buffer is sized from the canvas's CSS size, and the caller *must* pin that size in a style rule.
 *   A canvas's `width`/`height` attributes are presentational hints — they set the CSS width and height
 *   unless something outranks them — so without a pin the measurement feeds straight back into layout and
 *   the element freezes at whatever it was on the first frame.
 * - The context is never deliberately lost on cleanup. `getContext` hands back the *same* object for a
 *   given canvas, so losing it on unmount leaves React's second mount in development holding a dead one.
 */

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Fade in on focus, and out four times slower. Callers repeat these in classes; Tailwind reads literals. */
export const GLOW_FADE_OUT_MS = 1200;

/** The brand green, #1dd79b, as the shaders want it. */
export const BRAND_RGB = 'vec3(0.114, 0.843, 0.608)';

/**
 * Some mobile GL implementations have no high precision in the fragment stage; asking for it there fails
 * the compile outright, which would take the glow away silently. Prepended to every fragment shader.
 */
export const FRAGMENT_PRELUDE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x_) - 0.5;
    vec3 ox = floor(x_ + 0.5);
    vec3 a0 = x_ - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
`;

export interface ShaderFrame {
    canvas: HTMLCanvasElement;
    /** CSS pixels. */
    height: number;
    /** True on the frame the canvas changed size, so a layout read can be done then and not every frame. */
    resized: boolean;
    seconds: number;
    width: number;
}

export interface ShaderCanvasOptions {
    /** Drives the loop; it keeps running for the fade-out after this goes false. */
    active: boolean;
    fragment: string;
    /** Runs before the canvas is measured, for a glow that has to place itself around something first. */
    layout?: (canvas: HTMLCanvasElement) => void;
    /** Sets this frame's uniforms. Every name must be declared *and used* by the shader. */
    setUniforms: (set: (name: string, value: number) => void, frame: ShaderFrame) => void;
    uniformNames: readonly string[];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return undefined;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return undefined;
    }
    return shader;
}

export function useShaderCanvas({
    active,
    fragment,
    layout,
    setUniforms,
    uniformNames,
}: ShaderCanvasOptions): RefObject<HTMLCanvasElement | null> {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Read through refs, so a caller passing inline closures does not tear the context down each render.
    const callbacks = useRef({ layout, setUniforms });
    callbacks.current = { layout, setUniforms };
    // Outlives `active` by the fade-out, so the glow dissolves while still moving.
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (active) {
            setRunning(true);
            return;
        }
        const timer = setTimeout(() => setRunning(false), GLOW_FADE_OUT_MS);
        return () => clearTimeout(timer);
    }, [active]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // `alpha` so the bar shows through, and no antialias because a blurred glow has nothing to alias.
        //
        // Premultiplied, which is the default and the only one worth relying on: WebKit composites the
        // canvas as premultiplied whatever the attribute says, so a shader writing straight colour with a
        // low alpha had its colour added at full strength on iOS — a faint band on Chrome came out as a
        // slab of green over the whole field in Safari. Every fragment shader here multiplies its colour
        // by its own alpha to match.
        const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
        if (!gl || gl.isContextLost()) return;

        const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragment);
        const program = gl.createProgram();
        if (!vertexShader || !fragmentShader || !program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
        gl.useProgram(program);

        // One triangle covering the clip space, so there is no seam down the middle of a two-triangle quad.
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        // A null location is silently ignored by `uniform1f`, which would leave the shader working from a
        // zero it was never given; better to draw nothing than to draw whatever that produces.
        const locations = new Map<string, WebGLUniformLocation>();
        for (const name of uniformNames) {
            const location = gl.getUniformLocation(program, name);
            if (!location) return;
            locations.set(name, location);
        }
        const set = (name: string, value: number) => {
            const location = locations.get(name);
            if (location) gl.uniform1f(location, value);
        };

        let width = 0;
        let height = 0;

        const draw = (seconds: number) => {
            callbacks.current.layout?.(canvas);
            const nextWidth = Math.max(1, Math.round(canvas.clientWidth));
            const nextHeight = Math.max(1, Math.round(canvas.clientHeight));
            const resized = nextWidth !== width || nextHeight !== height;
            if (resized) {
                width = nextWidth;
                height = nextHeight;
                canvas.width = nextWidth;
                canvas.height = nextHeight;
            }
            // Every frame, off the buffer itself: nothing else may decide what the viewport is, so it
            // cannot fall out of step with a buffer that was resized elsewhere.
            gl.viewport(0, 0, canvas.width, canvas.height);
            callbacks.current.setUniforms(set, { canvas, height, resized, seconds, width });
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const observer = new ResizeObserver(() => draw(performance.now() / 1000));
        observer.observe(canvas);

        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let frame = 0;
        if (running && !still) {
            const start = performance.now();
            const loop = () => {
                draw((performance.now() - start) / 1000);
                frame = requestAnimationFrame(loop);
            };
            frame = requestAnimationFrame(loop);
        } else {
            draw(0);
        }

        return () => {
            if (frame) cancelAnimationFrame(frame);
            observer.disconnect();
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
        };
    }, [running, fragment, uniformNames]);

    return canvasRef;
}
