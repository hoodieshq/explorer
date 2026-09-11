import { breakpoints } from '@/tailwind.config';

export interface PreviewWidth {
    /** Breakpoint token, or `fill` for the pseudo-entry that hands the frame the whole stage. */
    id: string;
    label: string;
    /** Frame width in px; `undefined` means "take all available width". */
    width?: number;
}

/** Same floor as the prism (ALX_LOCAL/prism): narrower and the frame stops being reviewable. */
export const MIN_PREVIEW_WIDTH = 240;

/** Enough to keep the navbar plus a slice of page under it; below that there is nothing to judge. */
export const MIN_PREVIEW_HEIGHT = 200;

/**
 * One chip per Tailwind screen, straight from the `breakpoints` Map in tailwind.config so this list
 * cannot drift from what the utilities actually match.
 *
 * Widths are `base + 1`, which is the activation point rather than the breakpoint number: `getScreenDim`
 * builds every screen as `min-width: base + 1`, so a chip at a raw 768 renders the layout one pixel
 * *below* `md` and the utilities under review never fire — the reason the prism's own raw presets read as
 * "breakpoints not working". `.storybook/breakpoints.ts` derives its viewport badges the same way, so a
 * chip here and a badge there now land on the same layout.
 *
 * The label carries the real width, not the token's base number, so there is never a question about
 * which side of the edge is on screen.
 */
export const PREVIEW_WIDTHS: PreviewWidth[] = [
    ...[...breakpoints.entries()].map(([id, base]) => ({
        id,
        label: `${id} · ${base + 1}`,
        width: base + 1,
    })),
    { id: 'fill', label: 'fill' },
];

export const DEFAULT_PREVIEW_WIDTH_ID = 'lg';
