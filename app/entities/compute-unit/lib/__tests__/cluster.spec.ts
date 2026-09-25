import { Cluster } from '@utils/cluster';
import { describe, expect, it } from 'vitest';

import { toSupportedCluster } from '../cluster';

describe('toSupportedCluster', () => {
    it('should map every cluster the schedule is keyed by', () => {
        expect(toSupportedCluster(Cluster.MainnetBeta)).toBe('mainnet-beta');
        expect(toSupportedCluster(Cluster.Devnet)).toBe('devnet');
        expect(toSupportedCluster(Cluster.Testnet)).toBe('testnet');
        expect(toSupportedCluster(Cluster.Custom)).toBe('custom');
    });
});
