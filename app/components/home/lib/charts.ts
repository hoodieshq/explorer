// Pure geometry for the homepage's SVG stats. Separated from the components so the path maths can be
// unit-tested directly, without asserting on rendered SVG nodes.

export type SparklinePaths = { line: string; area: string };

/** Build the line and filled-area path strings for a sparkline, or undefined when there is nothing to draw. */
export function sparklinePaths(data: (number | null)[], width: number, height: number): SparklinePaths | undefined {
    const points = data.map(d => d ?? 0);
    if (points.length < 2) return undefined;

    const max = Math.max(...points, 1);
    const stepX = width / (points.length - 1);
    const coords = points.map((p, i) => [i * stepX, height - (p / max) * (height - 2) - 1] as const);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const area = `${line} L${width} ${height} L0 ${height} Z`;
    return { area, line };
}

/** Dash offset for a progress ring: 0 is empty, `circumference` is full. Progress is clamped to 0–1. */
export function ringDashOffset(progress: number, circumference: number): number {
    const clamped = Math.min(1, Math.max(0, progress));
    return circumference * (1 - clamped);
}
