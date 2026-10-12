// REVIEW(HOO-1823): the filtering variant picker for the inner review; remove before the external PR, keeping
// the variant the team picks.
import { useSyncExternalStore } from 'react';

export type BlockFilterVariant = 'original' | 'minimal' | 'linear' | 'sidebar' | 'popover' | 'combined';

// `desktop` / `mobile` name the container each variant's filters open in, shown under the pick in the design menu.
export const BLOCK_FILTER_VARIANTS: { desktop: string; label: string; mobile: string; variant: BlockFilterVariant }[] =
    [
        {
            desktop: 'Dropdown',
            label: 'Original',
            mobile: 'Dropdown',
            variant: 'original',
        },
        {
            desktop: 'Dropdown',
            label: 'Minimal',
            mobile: 'Dropdown',
            variant: 'minimal',
        },
        {
            desktop: 'Menu',
            label: 'Linear',
            mobile: 'Menu',
            variant: 'linear',
        },
        {
            desktop: 'Sidebar',
            label: 'Sidebar',
            mobile: 'Sidebar',
            variant: 'sidebar',
        },
        {
            desktop: 'Popover',
            label: 'Popover',
            mobile: 'Popover',
            variant: 'popover',
        },
        {
            desktop: 'Popover',
            label: 'Combined',
            mobile: 'Bottom sheet',
            variant: 'combined',
        },
    ];

// Shown until a reviewer picks another; a stored pick still wins.
const DEFAULT_VARIANT: BlockFilterVariant = 'combined';
const STORAGE_KEY = 'hoo-1823:filter-variant';
let current: BlockFilterVariant | undefined;
const listeners = new Set<() => void>();

export function useBlockFilterVariant(): BlockFilterVariant {
    return useSyncExternalStore(subscribe, read, () => DEFAULT_VARIANT);
}

export function setBlockFilterVariant(variant: BlockFilterVariant) {
    current = variant;
    try {
        localStorage.setItem(STORAGE_KEY, variant);
    } catch {
        // Storage can be blocked; the choice still holds for this page view.
    }
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function read(): BlockFilterVariant {
    if (current === undefined) {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            current = BLOCK_FILTER_VARIANTS.find(({ variant }) => variant === stored)?.variant ?? DEFAULT_VARIANT;
        } catch {
            current = DEFAULT_VARIANT;
        }
    }
    return current;
}
