import { AnchorProvider, Idl, Program } from '@coral-xyz/anchor';
import { formatSerdeIdl, getFormattedIdl } from '@entities/idl/format';
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
import { normalizeIdl, useAnchorProgram } from '@entities/idl/model/use-anchor-program';
import { getProvider, useIdlFromAnchorProgramSeed } from '@entities/idl/model/use-idl-from-anchor-program-seed';
import { clusterApiUrl, PublicKey } from '@solana/web3.js';
import { renderHook } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

// Create a mock provider that matches Anchor's expected structure
const createMockProvider = (mockUrl: string, mockProgramAddress: string) => ({
    connection: {
        commitment: 'confirmed',
        rpcEndpoint: mockUrl,
    },
    opts: {
        preflightCommitment: 'confirmed',
    },
    wallet: {
        publicKey: new PublicKey(mockProgramAddress),
        signAllTransactions: vi.fn(),
        signTransaction: vi.fn(),
    },
});

// Mock only the dependencies we need to control
vi.mock('@entities/idl/model/use-idl-from-anchor-program-seed', () => ({
    getProvider: vi.fn(),
    useIdlFromAnchorProgramSeed: vi.fn(),
}));

describe('Create program instance from legacy idl', () => {
    const url = clusterApiUrl('devnet');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor029Devi, 'any'],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchorLegacy034whir, '0.3.4'],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchorLegacy036whir, '0.3.6'],
        ['waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF', anchorLegacy094ShankWave, 'any'],
        ['compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq', anchorLegacyAccountComp, 'any'],
        ['BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY', anchorLegacyBubblegum, 'any'],
        ['cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m', anchorLegacyLightComprssedToken, 'any'],
        ['cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK', anchorLegacySplAccountCompr, 'any'],
        ['GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu', anchorLegacyStakeProgram, 'any'],
    ])('should create %s program instance; version: $2', (fallbackId: string, idl: any, _version?: string) => {
        const programAddress = normalizeIdl(idl).address;
        const programId = programAddress || fallbackId;

        vi.mocked(getProvider).mockReturnValue(createMockProvider(url, programId) as unknown as AnchorProvider);

        expect(() => {
            const formattedIdl = getFormattedIdl(formatSerdeIdl, idl, programId);
            const p = new Program(formattedIdl, getProvider(url));

            // if (fallbackId == 'compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq') {
            //     console.log(p._idl.accounts);
            // }

            expect(programId).toBe(p.programId.toString());
        }).not.toThrowError();
    });
});

describe('Create program instance from idl@0.30+', () => {
    const url = clusterApiUrl('devnet');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['EJAfNJ5Ue5xcJT17A3i9Yz594V4LZxhmuiautaT1U1F4', anchor030EJAf],
        ['gozqhNH1QuHW4TtEfaAde73FyvW452eXi3JEMLqvS5Q', anchor030gozh],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchor030whir],
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor030devi],
    ])('should create %s program instance', (fallbackId: string, idl: any) => {
        const programAddress = normalizeIdl(idl).address;
        const programId = programAddress || fallbackId;

        vi.mocked(getProvider).mockReturnValue(createMockProvider(url, programId) as unknown as AnchorProvider);

        expect(() => {
            const formattedIdl = idl as Idl;
            const p = new Program(formattedIdl, getProvider(url));
            expect(programId).toBe(p.programId.toString());
        }).not.toThrowError();
    });
});

describe('Allow for useAnchorProgram to create program instance', () => {
    const url = clusterApiUrl('devnet');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor029Devi],
        ['EJAfNJ5Ue5xcJT17A3i9Yz594V4LZxhmuiautaT1U1F4', anchor030EJAf],
        ['gozqhNH1QuHW4TtEfaAde73FyvW452eXi3JEMLqvS5Q', anchor030gozh],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchor030whir],
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor030devi],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchorLegacy034whir],
        ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', anchorLegacy036whir],
        ['waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF', anchorLegacy094ShankWave],
        ['compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq', anchorLegacyAccountComp],
        ['BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY', anchorLegacyBubblegum],
        ['cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m', anchorLegacyLightComprssedToken],
        ['cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK', anchorLegacySplAccountCompr],
        ['GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu', anchorLegacyStakeProgram],
    ])('should create %s program instance via hook', (fallbackId: string, idl: any) => {
        const programAddress = normalizeIdl(idl).address;
        const programId = programAddress || fallbackId;

        vi.mocked(useIdlFromAnchorProgramSeed).mockReturnValue(normalizeIdl(idl));
        vi.mocked(getProvider).mockReturnValue(createMockProvider(url, programId) as unknown as AnchorProvider);

        const { result } = renderHook(() => useAnchorProgram(programId, url, 2));
        expect(result.current.idl).not.toBeNull();
        expect(result.current.program?.programId.toString()).toEqual(programId);
    });
});
