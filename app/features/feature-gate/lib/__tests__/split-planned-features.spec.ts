import { describe, expect, it } from 'vitest';

import type { ActivatedFeature } from '../partition-features';
import { splitPlannedFeatures } from '../split-planned-features';

const feature = (title: string, clusterActivationEpoch: number) =>
    ({ clusterActivationEpoch, title }) as ActivatedFeature;

const FEATURES = [feature('far', 1090), feature('past', 1060), feature('current', 1075), feature('next', 1076)];

describe('splitPlannedFeatures', () => {
    it('should plan the epochs after the current one, the soonest first', () => {
        const { planned } = splitPlannedFeatures(FEATURES, 1075n);
        expect(planned.map(f => f.title)).toEqual(['next', 'far']);
    });

    it('should count the current epoch as activated and keep the input order there', () => {
        const { activated } = splitPlannedFeatures(FEATURES, 1075n);
        expect(activated.map(f => f.title)).toEqual(['past', 'current']);
    });

    it('should plan nothing while the current epoch is unknown', () => {
        const { activated, planned } = splitPlannedFeatures(FEATURES, undefined);
        expect(planned).toEqual([]);
        expect(activated).toHaveLength(FEATURES.length);
    });
});
