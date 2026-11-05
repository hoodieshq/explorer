'use client';

import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-926): the design-menu switch between the feature-gate table and the feed of records; remove with the
// losing variant before the external PR.
export type FeatureGateDesign = 'feed' | 'table';

// A new storage key: the old one may still hold a table variant that no longer exists.
export const featureGateDesignAtom = atomWithStorage<FeatureGateDesign>('hoo-926:feature-gate-design-v2', 'table');

export function useFeatureGateDesign() {
    return useAtomValue(featureGateDesignAtom);
}

// REVIEW(HOO-926): the design-menu switch for the page search: a button that opens into the field; the field always in
// view, dropping under the title when the two don't fit on one line; or the combo, the button on mobile and the open
// field on desktop.
export type FeatureGateSearchDesign = 'button' | 'combo' | 'field';

// The combo is the default. A new storage key, so a pick saved before it existed doesn't hide it.
export const featureGateSearchDesignAtom = atomWithStorage<FeatureGateSearchDesign>(
    'hoo-926:feature-gate-search-design-v2',
    'combo',
);

export function useFeatureGateSearchDesign() {
    return useAtomValue(featureGateSearchDesignAtom);
}
