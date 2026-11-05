import type { ActivatedFeature } from './partition-features';

/**
 * Splits the features with an activation epoch on the current cluster into the ones still ahead (planned, the
 * soonest first) and the ones already reached. While the current epoch is unknown, nothing counts as planned.
 */
export function splitPlannedFeatures(features: readonly ActivatedFeature[], currentEpoch: bigint | undefined) {
    const planned: ActivatedFeature[] = [];
    const activated: ActivatedFeature[] = [];
    for (const feature of features) {
        const ahead = currentEpoch !== undefined && BigInt(feature.clusterActivationEpoch) > currentEpoch;
        (ahead ? planned : activated).push(feature);
    }
    planned.sort((a, b) => a.clusterActivationEpoch - b.clusterActivationEpoch);
    return { activated, planned };
}
