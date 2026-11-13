'use client';

import { Button } from '@components/shared/ui/button';
import { useState } from 'react';

import { usePresetLink } from '../model/preset';

// REVIEW(design-menu): part of the review-only design menu; remove with it.

/** Copies a link that opens the current page with the menu's options as they are now. */
export function CopyPresetLink() {
    const presetLink = usePresetLink();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        const link = presetLink();
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), COPIED_FOR_MS);
        } catch {
            // The clipboard API needs a secure context, which the dev server's LAN address is not: show the link.
            window.prompt('Link to this preset', link);
        }
    };
    return (
        <Button size="sm" variant="outline" onClick={copy}>
            {copied ? 'Link copied' : 'Copy link to this preset'}
        </Button>
    );
}

const COPIED_FOR_MS = 1500;
