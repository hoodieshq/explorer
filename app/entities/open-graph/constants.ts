/** Width and height in px of an Open Graph image. */
export type ImageSize = {
    height: number;
    width: number;
};

/**
 * The size every Open Graph image in this app renders at.
 *
 * One value serves both halves of an unfurl: the `next/og` ImageResponse the route returns, and the
 * `og:image:width` / `og:image:height` the page declares. They have to agree or a crawler reserves a
 * box the image does not fill.
 */
export const IMAGE_SIZE: ImageSize = {
    height: 630,
    width: 1200,
};
