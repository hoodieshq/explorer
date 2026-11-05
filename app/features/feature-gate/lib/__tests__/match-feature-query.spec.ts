import { address } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

import { matchesFeatureQuery } from '../match-feature-query';

const FEATURE = {
    description: 'Two new instructions for moving value between stake accounts',
    key: address('7bTK6Jis8Xpfrs8ZoUfiMDPazTcdPcTWheZFJTA5Z6X4'),
    otherActivations: [{ cluster: Cluster.Devnet, epoch: 712 }],
    simdEntries: [{ link: 'https://example.com/0148.md', simd: '148' }],
    title: 'MoveStake and MoveLamports',
};

describe('matchesFeatureQuery', () => {
    it('should match every feature on an empty or blank query', () => {
        expect(matchesFeatureQuery(FEATURE, '')).toBe(true);
        expect(matchesFeatureQuery(FEATURE, '   ')).toBe(true);
    });

    it('should match the title, description and key regardless of case', () => {
        expect(matchesFeatureQuery(FEATURE, 'movestake')).toBe(true);
        expect(matchesFeatureQuery(FEATURE, 'STAKE ACCOUNTS')).toBe(true);
        expect(matchesFeatureQuery(FEATURE, '7btk6jis')).toBe(true);
    });

    it('should match the SIMD number with and without leading zeros', () => {
        expect(matchesFeatureQuery(FEATURE, '148')).toBe(true);
        expect(matchesFeatureQuery(FEATURE, '0148')).toBe(true);
    });

    it('should not match unrelated text', () => {
        expect(matchesFeatureQuery(FEATURE, 'alpenglow')).toBe(false);
        expect(matchesFeatureQuery(FEATURE, '0266')).toBe(false);
    });

    it('should search a feature without a description', () => {
        expect(matchesFeatureQuery({ ...FEATURE, description: null }, 'lamports')).toBe(true);
    });

    it('should match the epochs an upcoming feature shows for the other clusters', () => {
        expect(matchesFeatureQuery(FEATURE, '712')).toBe(true);
        expect(matchesFeatureQuery(FEATURE, '71')).toBe(true);
    });

    it('should match an activated feature by its epoch on this cluster only', () => {
        const activated = { ...FEATURE, clusterActivationEpoch: 1009 };
        expect(matchesFeatureQuery(activated, '1009')).toBe(true);
        expect(matchesFeatureQuery(activated, '712')).toBe(false);
    });
});
