'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import { cva } from 'class-variance-authority';
import { type ReactNode, useSyncExternalStore } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { getSafeExternalHref } from '@/app/shared/lib/url';

import { OriginalImageDialog } from './OriginalImageDialog';

// The "View original" link of the Metaplex NFT header from HOO-921, which isn't merged yet; fold the two into one
// once it is.

/**
 * A quiet link to the image at its source, for when the proxied copy fails or someone wants the full file. A click
 * always asks first (`OriginalImageDialog`). With a mouse, the external-site hint also opens on hovering it, like the
 * badges; a touch screen has no hover, so there the dialog alone explains.
 */
export function OriginalLink({
    uri,
    look = 'link',
}: {
    uri?: string;
    /**
     * REVIEW(HOO-929): `button` looks like the Overview card's Raw button, for the split header's button row; `ghost`
     * is a button of that size with no outline, in the type label's gray, for the card header's label row.
     */
    look?: 'link' | 'button' | 'ghost';
}) {
    const canHover = useCanHover();
    // The dialog would open any href; only an http(s) image gets the link at all.
    if (!uri || !getSafeExternalHref(uri)) return undefined;

    const trigger: ReactNode =
        look === 'button' ? (
            <Button variant="outline" size="sm">
                <ExternalLinkIcon size={12} />
                View original
            </Button>
        ) : (
            <button type="button" className={originalLinkVariants({ look })}>
                View original
                <ExternalLinkIcon size={12} />
            </button>
        );

    if (!canHover) {
        return <OriginalImageDialog uri={uri}>{trigger}</OriginalImageDialog>;
    }

    // The dialog's trigger props pass through the tooltip trigger onto the button, so one button opens both.
    return (
        <Tooltip>
            <OriginalImageDialog uri={uri}>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            </OriginalImageDialog>
            <TooltipContent>{EXTERNAL_RESOURCE_HINT}</TooltipContent>
        </Tooltip>
    );
}

// In the type label's gray (`text-muted`) so the header's two captions read as one. `link`: a quiet caption under the
// art. `ghost`: the `Button` `sm` box (height, padding, rounding; the icon 4px closer) with a hover fill instead of an
// outline; its own classes, since `Button`'s ghost is white and recolouring it from here would mean overriding the base
// component.
const originalLinkVariants = cva(
    'inline-flex w-fit items-center whitespace-nowrap border-0 bg-transparent text-xs text-muted hover:text-white',
    {
        variants: {
            look: {
                ghost: 'h-7 gap-1 rounded px-2 hover:bg-neutral-800',
                link: 'gap-1 p-0',
            },
        },
    },
);

// Says why the link deserves care: the image URL comes from metadata anyone can write.
const EXTERNAL_RESOURCE_HINT = 'External resource. Sees your IP address and may not be an image.';

const HOVER_QUERY = '(hover: hover)';

// Whether the main pointer can hover. Asked of the device, not the window width: a mouse on a narrow window still
// hovers, a touch tablet doesn't. The server render assumes a mouse.
function useCanHover() {
    const prismPointer = usePrismPointer();
    const deviceCanHover = useSyncExternalStore(
        onChange => {
            const query = window.matchMedia(HOVER_QUERY);
            query.addEventListener('change', onChange);
            return () => query.removeEventListener('change', onChange);
        },
        () => window.matchMedia(HOVER_QUERY).matches,
        () => true,
    );
    return prismPointer === undefined ? deviceCanHover : prismPointer === 'mouse';
}

// REVIEW(HOO-929): the local review prism (`public/_prism.html`, git-excluded) can't make the browser report another
// device, so it hands its Pointer choice to the frame: `window.__prismPointer` plus a 'prism:pointer' event. Outside
// the prism nothing sets it and the device decides.
function usePrismPointer(): 'mouse' | 'touch' | undefined {
    return useSyncExternalStore(
        onChange => {
            window.addEventListener('prism:pointer', onChange);
            return () => window.removeEventListener('prism:pointer', onChange);
        },
        () => (window as Window & { __prismPointer?: 'mouse' | 'touch' }).__prismPointer,
        () => undefined,
    );
}
