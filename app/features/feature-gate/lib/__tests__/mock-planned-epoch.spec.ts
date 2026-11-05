import { describe, expect, it } from 'vitest';

import { mockPlannedEpoch } from '../mock-planned-epoch';
import type { ActivatedFeature } from '../partition-features';

const at = (...epochs: number[]) => epochs.map(epoch => ({ clusterActivationEpoch: epoch }) as ActivatedFeature);

describe('mockPlannedEpoch', () => {
    it('should step back before the three latest activation epochs', () => {
        expect(mockPlannedEpoch(at(1064, 1052, 1036, 1035, 900), 1200n)).toBe(1035n);
    });

    it('should count an epoch shared by several features once', () => {
        expect(mockPlannedEpoch(at(1064, 1064, 1052, 1036, 900), 1200n)).toBe(1035n);
    });

    it('should keep the real epoch when it already leaves features ahead', () => {
        expect(mockPlannedEpoch(at(1064, 1052, 1036, 900), 1000n)).toBe(1000n);
    });

    it('should keep an unknown epoch unknown and an empty list as it is', () => {
        expect(mockPlannedEpoch(at(1064), undefined)).toBeUndefined();
        expect(mockPlannedEpoch([], 1200n)).toBe(1200n);
    });
});
