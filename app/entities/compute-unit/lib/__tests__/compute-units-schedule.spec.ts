import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { Cluster } from '@utils/cluster';

import { getReservedComputeUnits } from '../compute-units-schedule';

describe('getReservedComputeUnits', () => {
    it.each([
        { cluster: Cluster.MainnetBeta, gateEpoch: 759n, name: 'mainnet-beta' },
        { cluster: Cluster.Devnet, gateEpoch: 842n, name: 'devnet' },
        { cluster: Cluster.Testnet, gateEpoch: 750n, name: 'testnet' },
    ])('should apply the $name gate epoch to a builtin', ({ cluster, gateEpoch }) => {
        expect(getReservedComputeUnits({ cluster, epoch: gateEpoch - 1n, programId: SYSTEM_PROGRAM_ADDRESS })).toBe(
            200_000,
        );
        expect(getReservedComputeUnits({ cluster, epoch: gateEpoch, programId: SYSTEM_PROGRAM_ADDRESS })).toBe(3_000);
    });

    it('should apply the newest schedule on a custom cluster', () => {
        expect(getReservedComputeUnits({ cluster: Cluster.Custom, programId: SYSTEM_PROGRAM_ADDRESS })).toBe(3_000);
    });

    it('should reserve the default cu for a program id that is not valid base58', () => {
        expect(getReservedComputeUnits({ cluster: Cluster.MainnetBeta, epoch: 1000n, programId: 'not-base58' })).toBe(
            200_000,
        );
    });
});
