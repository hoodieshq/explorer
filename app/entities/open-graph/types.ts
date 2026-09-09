/** Width and height in px of an Open Graph image. */
export type ImageSize = {
    height: number;
    width: number;
};

/**
 * The glow behind a share image, one data URI per transaction status.
 *
 * A type rather than a loader concern: `loadOgGlows` reads off the filesystem and is reachable only through
 * the `server-only` barrel, while the card that takes these as a prop is rendered in a browser by Storybook.
 */
export type OgGlows = {
    failed: string;
    success: string;
};
