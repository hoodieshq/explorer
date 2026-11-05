'use client';

import { ExternalLinkMark } from '@components/shared/ui/external-link';
import { cva } from 'class-variance-authority';
import { Fragment } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'react-feather';

import { getSafeExternalHref } from '@/app/shared/lib/url';

import { OriginalImageDialog } from './OriginalImageDialog';

// The "View original" link of the Metaplex NFT header from HOO-921, which isn't merged yet; fold the two into one
// once it is.

/**
 * A quiet link to the image at its source, for when the proxied copy fails or someone wants the full file. A click
 * always asks first (`OriginalImageDialog`), and that dialog says what the site is, so no hint opens on hover.
 */
export function OriginalLink({
    uri,
    look = 'link',
}: {
    uri?: string;
    /**
     * REVIEW(HOO-929): `ghost` is a `Button` `sm`-sized box with no outline, in the type label's gray, for the card
     * headers' label row; `row` is the value of the header's Original row, the image's site in the page's link green.
     */
    look?: 'link' | 'ghost' | 'row';
}) {
    if (!hasOriginal(uri)) return undefined;

    // The row's value is laid out as the Overview card's Website link: the text, then the inline arrow.
    const trigger =
        look === 'row' ? (
            <button type="button" className={originalLinkVariants({ look })}>
                {/* One flex item, so the button's baseline is its first line's: a button on its own would line up
                    with its label by its last line once the site wraps. */}
                <span>
                    <SiteName hostname={new URL(uri).hostname} />
                    <ExternalLinkMark />
                </span>
            </button>
        ) : (
            <button type="button" className={originalLinkVariants({ look })}>
                View original
                {/* 1px up: centred on the box, the icon sits low against the text's x-height. */}
                <ExternalLinkIcon size={12} className="-translate-y-px" />
            </button>
        );

    return <OriginalImageDialog uri={uri}>{trigger}</OriginalImageDialog>;
}

/** The dialog would open any href; only an http(s) image gets the link at all, and the Original row with it. */
export function hasOriginal(uri: string | undefined): uri is string {
    return !!uri && !!getSafeExternalHref(uri);
}

// In the type label's gray so the header's two captions read as one: `link` in the plain header's `text-muted`, a
// quiet caption under the art; `ghost` in the card header's key gray (`text-outer-space-300`, the key-value rows'
// keys). `ghost` is the `Button` `sm` box (height, padding, rounding; the icon 4px closer) with a hover fill instead
// of an outline; its own classes, since `Button`'s ghost is white and recolouring it from here would mean overriding
// the base component.
const originalLinkVariants = cva('border-0 bg-transparent', {
    variants: {
        look: {
            ghost: 'inline-flex h-7 w-fit items-center gap-1 whitespace-nowrap rounded px-2 text-xs text-outer-space-300 hover:bg-neutral-800 hover:text-white',
            link: 'inline-flex w-fit items-center gap-1 whitespace-nowrap p-0 text-xs text-muted hover:text-white',
            // The colours of every other link on the page (`a` in `styles.css`), which this button stands with. Its one
            // item is plain text flow, so a site too long for the line wraps and the arrow follows its last line.
            row: 'inline-flex p-0 text-left text-sm text-[#33a382] hover:text-[#2b8a6e]',
        },
    },
});

/** A site's name that wraps after its dots (`<wbr>`), not in the middle of a word. */
function SiteName({ hostname }: { hostname: string }) {
    const parts = hostname.split('.');
    return (
        <>
            {parts.map((part, index) => (
                // The parts of a name can repeat (`a.a.com`), and they never reorder.
                <Fragment key={index}>
                    {part}
                    {index < parts.length - 1 && (
                        <>
                            .<wbr />
                        </>
                    )}
                </Fragment>
            ))}
        </>
    );
}
