import React from 'react';

import { cn } from '@/app/components/shared/utils';

import { ICON_SHIM, ICON_SIZE, type LabelSize, type LineBox } from './tokens';

/**
 * The icon counterpart of `Label` — the wrapper a label's icon goes in so it's positioned
 * *once*. Like `Label`, it fills a standardized line-box height (`lineBox`) via an asymmetric
 * shim, but instead of a text baseline it drops the icon's optical center onto the label's
 * optical center (see ICON_SHIM). So an `Icon` and a same-size `Label` dropped side by side in
 * a `KeyValue` sit on the same grid with no per-call nudging.
 *
 * Pass the raw icon as children (e.g. a react-feather `<HelpCircle />`); the wrapper sizes it
 * to `ICON_SIZE[size]` (any child <svg> is stretched to fill) and inherits the surrounding
 * color via `currentColor`, so inside a `Label` it picks up the label color automatically.
 */
export function Icon({
    size = 'm',
    lineBox = 24,
    className,
    children,
}: {
    size?: LabelSize;
    lineBox?: LineBox;
    className?: string;
    children: React.ReactNode;
}) {
    const box = ICON_SIZE[size];
    // Fall back to a symmetric-ish no-op if an unsupported (size × line-box) combo is requested.
    const [paddingTop, paddingBottom] = ICON_SHIM[size][lineBox] ?? [0, 0];

    return (
        <span
            className={cn(
                'inline-flex flex-none items-center justify-center align-top [&_svg]:block [&_svg]:h-full [&_svg]:w-full',
                className,
            )}
            // content-box: width/height are the icon itself; the shim padding adds on top so the
            // total box height is exactly `lineBox` (pt + box + pb === lineBox — see ICON_SHIM).
            style={{ boxSizing: 'content-box', height: box, paddingBottom, paddingTop, width: box }}
        >
            {children}
        </span>
    );
}
