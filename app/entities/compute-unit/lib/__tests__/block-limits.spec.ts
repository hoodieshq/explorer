import { Cluster } from '@utils/cluster';

import { getMaxComputeUnitsInBlock } from '../block-limits';

describe('getMaxComputeUnitsInBlock', () => {
    it('should return the correct max compute units for an epoch on mainnet', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 0n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 769n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 770n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 821n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 822n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 823n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 1008n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 1009n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 1010n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: undefined })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: -1n })).toEqual(48_000_000);
    });

    it('should return the correct max compute units for an epoch on devnet', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 0n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 856n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 857n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 914n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 915n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 916n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 1099n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 1100n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 1101n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: undefined })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: -1n })).toEqual(48_000_000);
    });

    it('should return the correct max compute units for an epoch on testnet', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 0n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 763n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 764n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 811n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 812n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 813n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 982n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 983n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 984n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: undefined })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: -1n })).toEqual(48_000_000);
    });

    it('should return the correct max compute units for an epoch on custom', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 0n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 769n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 770n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 821n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 822n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 823n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: undefined })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: -1n })).toEqual(100_000_000);
    });
});
