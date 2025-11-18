import { formatDisplayIdl, getFormattedIdl } from '@entities/idl/format';
import anchor029Devi from '@entities/idl/mocks/anchor/anchor-0.29.0-devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH.json';
import anchor030EJAf from '@entities/idl/mocks/anchor/anchor-0.30.0-EJAfNJ5Ue5xcJT17A3i9Yz594V4LZxhmuiautaT1U1F4.json';
import anchor030gozh from '@entities/idl/mocks/anchor/anchor-0.30.0-gozqhNH1QuHW4TtEfaAde73FyvW452eXi3JEMLqvS5Q.json';
import anchor030whir from '@entities/idl/mocks/anchor/anchor-0.30.0-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import anchor030devi from '@entities/idl/mocks/anchor/anchor-0.30.1-devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH.json';
import anchorLegacy034whir from '@entities/idl/mocks/anchor/anchor-legacy-0.3.4-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import anchorLegacy036whir from '@entities/idl/mocks/anchor/anchor-legacy-0.3.6-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import anchorLegacy094ShankWave from '@entities/idl/mocks/anchor/anchor-legacy-0.9.4-shank-waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF.json';
import anchorLegacyAccountComp from '@entities/idl/mocks/anchor/anchor-legacy-account_compression-compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq.json';
import anchorLegacyBubblegum from '@entities/idl/mocks/anchor/anchor-legacy-bubblegum-BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY.json';
import anchorLegacyLightComprssedToken from '@entities/idl/mocks/anchor/anchor-legacy-light_compressed_token-cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m.json';
import anchorLegacySplAccountCompr from '@entities/idl/mocks/anchor/anchor-legacy-spl_account_compression-cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK.json';
import anchorLegacyStakeProgram from '@entities/idl/mocks/anchor/anchor-legacy-stake_program-GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu.json';
import { normalizeIdl } from '@entities/idl/model/use-anchor-program';
import { useFormatAnchorIdl } from '@features/idl/formatted-idl/model/use-format-anchor-idl'; // it is not a good practice to rely onto feature at entities, but currently formatting is inside the feature
import { clusterApiUrl } from '@solana/web3.js';
import { renderHook } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

function toLengths(result: any) {
    return Object.keys(result ?? {}).map(field => {
        const obj: Record<string, any> = result as NonNullable<any>;
        return result ? obj[field]?.length : undefined;
    });
}

describe('formatDisplayIdl', () => {
    const url = clusterApiUrl('devnet');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor029Devi, [8, 0, 42, 11, 23, 0, 5]],
        ['EJAfNJ5Ue5xcJT17A3i9Yz594V4LZxhmuiautaT1U1F4', anchor030EJAf, [2, 2, 8, undefined, 4, 3, 0]],
        ['gozqhNH1QuHW4TtEfaAde73FyvW452eXi3JEMLqvS5Q', anchor030gozh, [8, 6, 39, undefined, 24, 14, 8]],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchor030whir, [9, undefined, 60, 4, 49, 0, 11]],
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor030devi, [8, undefined, 42, 11, 23, 0, 9]],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchorLegacy034whir, [9, 0, 60, 4, 49, 0, 11]],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchorLegacy036whir, [11, 0, 65, 4, 58, 0, 13]],
        ['waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF', anchorLegacy094ShankWave, [5, 0, 30, 0, 56, 0, 11]],
        ['compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq', anchorLegacyAccountComp, [9, 16, 27, 0, 13, 0, 4]],
        ['BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY', anchorLegacyBubblegum, [2, 0, 40, 0, 17, 0, 10]],
        ['cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m', anchorLegacyLightComprssedToken, [0, 0, 26, 0, 9, 0, 10]],
        ['cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK', anchorLegacySplAccountCompr, [0, 0, 8, 0, 7, 0, 0]],
        ['GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu', anchorLegacyStakeProgram, [5, 0, 16, 0, 17, 0, 0]],
    ])(
        'should display %s program idl via useFormatAnchorIdl hook',
        (fallbackId: string, idl: any, structure: (number | undefined)[]) => {
            const programAddress = normalizeIdl(idl).address;
            const programId = programAddress || fallbackId;

            expect(() => {
                const formattedIdl = getFormattedIdl(formatDisplayIdl, idl, programId);
                expect(formattedIdl.address).toEqual(programId);

                const { result } = renderHook(() => useFormatAnchorIdl(formattedIdl));
                expect(toLengths(result.current)).toEqual(structure);
            }).not.toThrowError();
        }
    );
});
