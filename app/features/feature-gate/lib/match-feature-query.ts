import type { UpcomingFeature } from './partition-features';

type SearchableFeature = Pick<UpcomingFeature, 'description' | 'key' | 'otherActivations' | 'simdEntries' | 'title'> & {
    clusterActivationEpoch?: number;
};

/**
 * Whether a feature matches the page's search text: a case-insensitive substring of the title, the
 * description, the key, the SIMD number as the page prints it ("266" and "0266" both find SIMD 0266), or an
 * activation epoch the feature's row shows: its epoch on this cluster once it has one, the other clusters' while it
 * is upcoming. An empty query matches every feature.
 */
export function matchesFeatureQuery(feature: SearchableFeature, query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;

    const texts = [feature.title, feature.description ?? '', feature.key];
    if (texts.some(text => text.toLowerCase().includes(needle))) return true;

    if (feature.simdEntries.some(({ simd }) => simd.padStart(4, '0').includes(needle))) return true;

    // Only the epochs on the row: one it doesn't show would leave a match with nothing to point at.
    const epochs =
        feature.clusterActivationEpoch === undefined
            ? feature.otherActivations.map(({ epoch }) => epoch)
            : [feature.clusterActivationEpoch];
    return epochs.some(epoch => String(epoch).includes(needle));
}
