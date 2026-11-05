import type { ActivatedFeature } from './partition-features';

/**
 * REVIEW(HOO-926): the design menu's stand-in for a cluster with features still ahead, so a preview on live data,
 * where every activation is past, still shows the Planned section. Returns the epoch to treat as current: one before
 * the `count` latest activation epochs, so those read as planned; or the real epoch, when that already leaves some
 * ahead or isn't known yet. Remove with the design menu.
 */
export function mockPlannedEpoch(
    features: readonly ActivatedFeature[],
    currentEpoch: bigint | undefined,
    count = 3,
): bigint | undefined {
    if (currentEpoch === undefined) return currentEpoch;
    const epochs = [...new Set(features.map(feature => feature.clusterActivationEpoch))].sort((a, b) => b - a);
    const nth = epochs[Math.min(count, epochs.length) - 1];
    if (nth === undefined) return currentEpoch;
    const mocked = BigInt(nth - 1);
    return mocked < currentEpoch ? mocked : currentEpoch;
}
